import { createClient } from '@supabase/supabase-js'
import { syncInterviewTopicsToPersona } from '@/lib/services/miso'
import { 
  PersonaSynthesisParams, 
  PersonaSynthesisResult, 
  PersonaSynthesisOutputs,
  WorkflowRequest,
  Persona
} from './types'

export class PersonasService {
  private static supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  /**
   * Synthesize a persona from interview data
   */
  static async synthesizePersona(params: PersonaSynthesisParams): Promise<PersonaSynthesisResult> {
    const { 
      selectedInterviewee, 
      personaType, 
      projectId, 
      personaId,
      companyId,
      userName
    } = params

    // Find or prepare persona data
    const { persona: selectedPersona, isNewPersona, activeGenerateImage } = await this.findOrPreparePersona({
      personaId,
      personaType,
      companyId,
      selectedInterviewee
    })

    // Call MISO API for synthesis
    const synthesisResult = await this.callMisoSynthesis({
      selectedInterviewee,
      selectedPersona,
      activeGenerateImage,
      userName
    })

    const outputs = synthesisResult?.data?.outputs || synthesisResult?.outputs

    // Update or create persona in database
    if (outputs && Object.keys(outputs).length > 0) {
      await this.updatePersonaDatabase({
        outputs,
        isNewPersona,
        personaType,
        companyId,
        projectId,
        selectedPersona,
        selectedInterviewee
      })
    }

    return {
      success: true,
      data: synthesisResult,
      isNewPersona,
      outputs: outputs as PersonaSynthesisOutputs
    }
  }

  /**
   * Find existing persona or prepare data for new one
   */
  private static async findOrPreparePersona({
    personaId,
    personaType,
    companyId,
    selectedInterviewee
  }: {
    personaId?: string
    personaType: string
    companyId: string
    selectedInterviewee: any
  }): Promise<{
    persona: Persona
    isNewPersona: boolean
    activeGenerateImage: string
  }> {
    let personas, personasError

    if (personaId) {
      // Direct query by persona ID
      const { data, error } = await this.supabase
        .from('personas')
        .select(`
          id,
          persona_type,
          persona_description,
          persona_summary,
          persona_style,
          painpoints,
          needs,
          insight,
          insight_quote,
          thumbnail,
          project_id,
          miso_dataset_id
        `)
        .eq('id', personaId)
        .eq('company_id', companyId)
        .eq('active', true)

      personas = data
      personasError = error
    } else {
      // Query by persona type
      const { data, error } = await this.supabase
        .from('personas')
        .select(`
          id,
          persona_type,
          persona_description,
          persona_summary,
          persona_style,
          painpoints,
          needs,
          insight,
          insight_quote,
          thumbnail,
          project_id,
          miso_dataset_id
        `)
        .eq('company_id', companyId)
        .eq('persona_type', personaType)
        .eq('active', true)

      personas = data
      personasError = error
    }

    if (personasError) {
      throw new Error('페르소나 데이터를 조회하는데 실패했습니다.')
    }

    // Parse interviewee if string
    let parsedInterviewee = selectedInterviewee
    if (typeof selectedInterviewee === 'string') {
      try {
        parsedInterviewee = JSON.parse(selectedInterviewee)
      } catch (e) {
        parsedInterviewee = { user_description: selectedInterviewee }
      }
    }

    // No existing persona - prepare for new creation
    if (!personas || personas.length === 0) {
      return {
        persona: {
          persona_type: personaType,
          persona_description: parsedInterviewee.description || parsedInterviewee.user_description || `${personaType} 타입 사용자`,
          persona_summary: '',
          persona_style: '',
          painpoints: '',
          needs: '',
          insight: '',
          insight_quote: ''
        },
        isNewPersona: true,
        activeGenerateImage: "true"
      }
    }

    // Use existing persona
    const selectedPersona = personas[0]
    const activeGenerateImage = (!selectedPersona?.thumbnail || selectedPersona.thumbnail === null || selectedPersona.thumbnail.trim() === '') ? "true" : "false"

    return {
      persona: selectedPersona,
      isNewPersona: false,
      activeGenerateImage
    }
  }

  /**
   * Call MISO API for persona synthesis
   */
  private static async callMisoSynthesis({
    selectedInterviewee,
    selectedPersona,
    activeGenerateImage,
    userName
  }: {
    selectedInterviewee: any
    selectedPersona: Persona
    activeGenerateImage: string
    userName: string
  }): Promise<any> {
    const requestBody: WorkflowRequest = {
      inputs: {
        preprocess_type: 'persona',
        selected_interviewee: typeof selectedInterviewee === 'string' 
          ? selectedInterviewee 
          : JSON.stringify(selectedInterviewee),
        selected_persona: JSON.stringify(selectedPersona),
        active_generate_image: activeGenerateImage
      },
      mode: 'blocking',
      user: userName || 'persona-insight-user',
      files: []
    }

    const MISO_API_URL = process.env.MISO_API_URL || 'https://api.holdings.miso.gs'
    const MISO_API_KEY = process.env.MISO_API_KEY

    if (!MISO_API_KEY) {
      throw new Error('API 키가 설정되지 않았습니다.')
    }

    const response = await fetch(`${MISO_API_URL}/ext/v1/workflows/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      let errorMessage = '페르소나 합성 중 오류가 발생했습니다'
      
      try {
        const errorText = await response.text()
        try {
          const errorData = JSON.parse(errorText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = errorText || errorMessage
        }
      } catch {
        errorMessage = `HTTP ${response.status} ${response.statusText}`
      }
      
      throw new Error(errorMessage)
    }

    return response.json()
  }

  /**
   * Update persona in database with synthesis results
   */
  private static async updatePersonaDatabase({
    outputs,
    isNewPersona,
    personaType,
    companyId,
    projectId,
    selectedPersona,
    selectedInterviewee
  }: {
    outputs: PersonaSynthesisOutputs
    isNewPersona: boolean
    personaType: string
    companyId: string
    projectId?: string
    selectedPersona: Persona
    selectedInterviewee: any
  }): Promise<void> {
    let finalPersonaId: string

    if (isNewPersona) {
      // Check if persona already exists
      const { data: existingPersona, error: checkError } = await this.supabase
        .from('personas')
        .select('id')
        .eq('company_id', companyId)
        .eq('persona_type', personaType)
        .eq('active', true)
        .single()

      if (existingPersona && !checkError) {
        // Update existing
        finalPersonaId = existingPersona.id
        await this.updateExistingPersona(existingPersona.id, outputs)
      } else {
        // Create new
        const newPersona = await this.createNewPersona({
          personaType,
          companyId,
          projectId,
          outputs,
          selectedInterviewee
        })
        finalPersonaId = newPersona.id
      }
    } else {
      // Update existing
      finalPersonaId = selectedPersona.id!
      await this.updateExistingPersona(selectedPersona.id!, outputs)
    }

    // Update interview data
    if (selectedInterviewee.id) {
      await this.updateInterviewData(selectedInterviewee.id, finalPersonaId)
      
      // Sync topics if dataset exists
      const { data: currentPersona } = await this.supabase
        .from('personas')
        .select('miso_dataset_id')
        .eq('id', finalPersonaId)
        .single()

      if (currentPersona?.miso_dataset_id) {
        try {
          await syncInterviewTopicsToPersona(
            selectedInterviewee.id,
            finalPersonaId,
            currentPersona.miso_dataset_id
          )
        } catch (error) {
          // Log but don't fail
          console.warn('Topic sync failed:', error)
        }
      }
    }
  }

  /**
   * Create a new persona
   */
  private static async createNewPersona({
    personaType,
    companyId,
    projectId,
    outputs,
    selectedInterviewee
  }: {
    personaType: string
    companyId: string
    projectId?: string
    outputs: PersonaSynthesisOutputs
    selectedInterviewee: any
  }): Promise<{ id: string }> {
    const parsedInterviewee = typeof selectedInterviewee === 'string' 
      ? JSON.parse(selectedInterviewee) 
      : selectedInterviewee

    const insertData = {
      persona_type: personaType,
      persona_description: parsedInterviewee.description || parsedInterviewee.user_description || `${personaType} 타입 사용자`,
      persona_summary: outputs.persona_summary || '',
      persona_style: outputs.persona_style || '',
      painpoints: outputs.painpoints || '',
      needs: outputs.needs || '',
      insight: outputs.insight || '',
      insight_quote: outputs.insight_quote || '',
      thumbnail: this.extractThumbnailUrl(outputs.thumbnail),
      company_id: companyId,
      project_id: projectId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const { data, error } = await this.supabase
      .from('personas')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      throw new Error('페르소나 생성에 실패했습니다')
    }

    return data
  }

  /**
   * Update existing persona
   */
  private static async updateExistingPersona(
    personaId: string, 
    outputs: PersonaSynthesisOutputs
  ): Promise<void> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Add fields if present in outputs
    if (outputs.persona_summary) updateData.persona_summary = outputs.persona_summary
    if (outputs.persona_style) updateData.persona_style = outputs.persona_style
    if (outputs.painpoints) updateData.painpoints = outputs.painpoints
    if (outputs.needs) updateData.needs = outputs.needs
    if (outputs.insight) updateData.insight = outputs.insight
    if (outputs.insight_quote) updateData.insight_quote = outputs.insight_quote
    if (outputs.thumbnail) {
      updateData.thumbnail = this.extractThumbnailUrl(outputs.thumbnail)
    }

    const { error } = await this.supabase
      .from('personas')
      .update(updateData)
      .eq('id', personaId)

    if (error) {
      throw new Error('페르소나 업데이트에 실패했습니다')
    }
  }

  /**
   * Update interview data after persona synthesis
   */
  private static async updateInterviewData(
    interviewId: string, 
    personaId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('interviewees')
      .update({
        persona_reflected: true,
        persona_id: personaId,
        updated_at: new Date().toISOString()
      })
      .eq('id', interviewId)

    if (error) {
      console.warn('Interview update failed:', error)
    }
  }

  /**
   * Extract thumbnail URL from various formats
   */
  private static extractThumbnailUrl(thumbnail?: string | { imageUrl: string } | null): string | null {
    if (!thumbnail) return null
    
    if (typeof thumbnail === 'string') {
      return thumbnail
    } else if (typeof thumbnail === 'object' && 'imageUrl' in thumbnail) {
      return thumbnail.imageUrl
    }
    
    return null
  }
}