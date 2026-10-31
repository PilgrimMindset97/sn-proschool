export type AppRole =
  | 'super_admin'
  | 'admin'
  | 'directeur'
  | 'directeur_etudes'
  | 'surveillant_general'
  | 'surveillant_general_adjoint'
  | 'personnel_administratif'
  | 'agent_securite'
  | 'agent_entretien'
  | 'comptable'
  | 'secretaire'
  | 'censeur'
  | 'enseignant'
  | 'parent';

export type CycleType = 'Maternelle' | 'Primaire' | 'Collège' | 'Lycée';

export interface Establishment {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  active: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  establishment_id: string | null;
  active: boolean;
  must_change_password: boolean;
  created_by: string | null;
  created_at: string;
}

export interface SchoolYear {
  id: string;
  establishment_id: string;
  label: string;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  created_at: string;
}

export interface Term {
  id: string;
  school_year_id: string;
  label: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export interface ClassRow {
  id: string;
  establishment_id: string;
  school_year_id: string | null;
  cycle: CycleType;
  niveau: string;
  nom: string;
  capacity: number;
  created_at: string;
}

export interface Subject {
  id: string;
  establishment_id: string;
  cycle: CycleType;
  nom: string;
  coefficient: number;
  created_at: string;
}

export interface Teacher {
  id: string;
  establishment_id: string;
  nom: string;
  matiere: string;
  classes: string;
  cycle: string | null;
  salle: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  establishment_id: string;
  matricule: string;
  nom: string;
  prenom: string;
  cycle: CycleType;
  classe: string;
  parent_name: string;
  telephone: string;
  account_email: string;
  photo_url: string | null;
  active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Grade {
  id: string;
  establishment_id: string;
  student_id: string;
  matiere: string;
  note: number;
  bareme: number;
  coefficient: number;
  periode: string;
  is_absent: boolean;
  created_by: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  establishment_id: string;
  student_id: string;
  motif: string;
  montant: number;
  date_paiement: string;
  mode: string;
  reference: string;
  status: string;
  created_by: string | null;
  created_at: string;
}

export interface Attendance {
  id: string;
  establishment_id: string;
  student_id: string;
  date_presence: string;
  statut: string;
  motif: string | null;
  created_by: string | null;
  created_at: string;
}

export interface StaffAttendance {
  id: string;
  establishment_id: string;
  nom: string;
  fonction: string;
  date_presence: string;
  heure_arrivee: string | null;
  heure_depart: string | null;
  jour: string | null;
  salle: string | null;
  matiere: string | null;
  statut: string;
  motif: string | null;
  created_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: number;
  establishment_id: string | null;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

export interface StaffSession {
  id: string;
  establishment_id: string | null;
  user_id: string;
  started_at: string;
  last_seen_at: string;
  ended_at: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AccountRequest {
  id: string;
  establishment_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  requested_role: string;
  message: string;
  status: string;
  created_at: string;
}

export interface ParentStudentLink {
  parent_user_id: string;
  student_id: string;
}

export const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: 'Super Administrateur',
  admin: 'Administrateur',
  directeur: 'Directeur',
  directeur_etudes: 'Directeur des études',
  surveillant_general: 'Surveillant général',
  surveillant_general_adjoint: 'Surveillant général adjoint',
  personnel_administratif: 'Personnel administratif',
  agent_securite: 'Agent de sécurité',
  agent_entretien: "Agent d'entretien",
  comptable: 'Comptable',
  secretaire: 'Secrétaire',
  censeur: 'Censeur',
  enseignant: 'Enseignant',
  parent: 'Parent',
};

export const CYCLES: CycleType[] = ['Maternelle', 'Primaire', 'Collège', 'Lycée'];

export const CYCLE_LEVELS: Record<CycleType, string[]> = {
  Maternelle: ['Petite section', 'Moyenne section', 'Grande section'],
  Primaire: ['CP', 'CE1', 'CE2', 'CM1', 'CM2'],
  Collège: ['6ème', '5ème', '4ème', '3ème'],
  Lycée: ['Seconde', 'Première', 'Terminale', 'Première A.D.C.', 'Terminale A.D.C.'],
};

export const DEFAULT_SUBJECTS: Record<CycleType, string[]> = {
  Maternelle: ['Motricité', 'Langage', 'Activités artistiques', 'Découverte du monde'],
  Primaire: ['Français', 'Mathématiques', 'Histoire-Géographie', 'Sciences', 'EPS', 'Arts'],
  Collège: ['Français', 'Mathématiques', 'Histoire-Géographie', 'SVT', 'Physique-Chimie', 'Anglais', 'EPS', 'Arts'],
  Lycée: ['Français', 'Mathématiques', 'Histoire-Géographie', 'SVT', 'Physique-Chimie', 'Anglais', 'Philosophie', 'EPS', 'Économie'],
};
