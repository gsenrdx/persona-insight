import { apiClient } from './base'
import { 
  ApiResponse,
  LoginRequest,
  SignupRequest,
  AuthUser,
  AuthResponse,
  ProfileUpdateRequest
} from '@/types/api'

/**
 * 인증 관련 API 함수들
 */
export const authApi = {
  /**
   * 로그인
   */
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>('/api/auth/login', credentials)
  },

  /**
   * 회원가입
   */
  async signup(userData: SignupRequest): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>('/api/auth/signup', userData)
  },

  /**
   * 로그아웃
   */
  async logout(): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/api/auth/logout')
  },

  /**
   * 토큰 새로고침
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
    return apiClient.post<AuthResponse>('/api/auth/refresh', { refreshToken })
  },

  /**
   * 현재 사용자 정보 조회
   */
  async getCurrentUser(token: string): Promise<ApiResponse<AuthUser>> {
    return apiClient.authenticatedRequest<AuthUser>('/api/auth/me', token)
  },

  /**
   * 프로필 업데이트
   */
  async updateProfile(
    token: string, 
    profileData: ProfileUpdateRequest
  ): Promise<ApiResponse<AuthUser>> {
    return apiClient.authenticatedRequest<AuthUser>(
      '/api/auth/profile', 
      token,
      {
        method: 'PUT',
        body: JSON.stringify(profileData)
      }
    )
  },

  /**
   * 비밀번호 변경
   */
  async changePassword(
    token: string,
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<void>> {
    return apiClient.authenticatedRequest<void>(
      '/api/auth/change-password',
      token,
      {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
      }
    )
  },

  /**
   * 비밀번호 재설정 요청
   */
  async requestPasswordReset(email: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/api/auth/reset-password', { email })
  },

  /**
   * 비밀번호 재설정
   */
  async resetPassword(
    token: string, 
    newPassword: string
  ): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/api/auth/reset-password/confirm', {
      token,
      password: newPassword
    })
  },

  /**
   * 이메일 인증
   */
  async verifyEmail(verificationToken: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/api/auth/verify-email', {
      token: verificationToken
    })
  },

  /**
   * 이메일 인증 재전송
   */
  async resendVerificationEmail(email: string): Promise<ApiResponse<void>> {
    return apiClient.post<void>('/api/auth/resend-verification', { email })
  }
}