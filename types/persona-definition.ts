// 페르소나 메트릭 타입
export interface PersonaMetrics {
  charging_focus: 'Home-Primary' | 'Office-Primary' | 'Public-Primary' | 'Route-Based';
  cost_sensitivity: 'None' | 'Low' | 'Medium' | 'High';
  preferred_speed: 'AC-Dominant' | 'DC-Dominant' | 'Mixed';
  charging_pattern: 'Routine' | 'Opportunistic' | 'Weekday/Weekend-Distinct' | 'Route-Based' | 'Loyal-Local';
  decision_style: 'Planned' | 'Opportunistic' | 'Dynamic & Flexible';
  tech_adoption: 'Low' | 'Medium' | 'High';
  priority: 'Cost' | 'Convenience' | 'Efficiency' | 'Experience & Comfort' | 'Amenity-Driven' | 'Absolute-Speed';
  wait_tolerance: 'Zero' | 'Low' | 'Medium' | 'Medium-High' | 'High';
  service_preference: 'Basic' | 'Standard' | 'Premium';
}

// 페르소나 정의 타입
export interface PersonaDefinition {
  id: string; // P1, P2, ... P9
  name_ko: string;
  name_en: string;
  description?: string;
  metrics: PersonaMetrics;
  tags: string[];
  evolution_path?: string;
  created_at: string;
  updated_at: string;
}