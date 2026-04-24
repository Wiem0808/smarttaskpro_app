// ══════════════════════════════════════════
// SmartTask Pro — Internationalization (i18n)
// Languages: English, Français, Italiano
// ══════════════════════════════════════════

export const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
];

const translations = {
  // ── Common ─────────────────────────────
  save:        { fr: 'Enregistrer',  en: 'Save',       it: 'Salva' },
  cancel:      { fr: 'Annuler',      en: 'Cancel',     it: 'Annulla' },
  create:      { fr: 'Créer',        en: 'Create',     it: 'Crea' },
  edit:        { fr: 'Modifier',     en: 'Edit',       it: 'Modifica' },
  delete:      { fr: 'Supprimer',    en: 'Delete',     it: 'Elimina' },
  search:      { fr: 'Rechercher...', en: 'Search...', it: 'Cerca...' },
  loading:     { fr: 'Chargement...', en: 'Loading...', it: 'Caricamento...' },
  noData:      { fr: 'Aucune donnée', en: 'No data',   it: 'Nessun dato' },
  confirm:     { fr: 'Confirmer',    en: 'Confirm',    it: 'Conferma' },
  actions:     { fr: 'Actions',      en: 'Actions',    it: 'Azioni' },
  status:      { fr: 'Statut',       en: 'Status',     it: 'Stato' },
  name:        { fr: 'Nom',          en: 'Name',       it: 'Nome' },
  description: { fr: 'Description',  en: 'Description', it: 'Descrizione' },
  all:         { fr: 'Tous',         en: 'All',        it: 'Tutti' },
  none:        { fr: 'Aucun',        en: 'None',       it: 'Nessuno' },
  irreversible:{ fr: 'Cette action est irréversible.', en: 'This action is irreversible.', it: 'Questa azione è irreversibile.' },

  // ── Auth / Login ───────────────────────
  login:           { fr: 'Connexion',          en: 'Login',              it: 'Accesso' },
  loginSubtitle:   { fr: 'Accédez à votre espace de travail', en: 'Access your workspace', it: 'Accedi al tuo spazio di lavoro' },
  email:           { fr: 'Email',              en: 'Email',              it: 'Email' },
  password:        { fr: 'Mot de passe',       en: 'Password',           it: 'Password' },
  loginBtn:        { fr: 'Se connecter',       en: 'Sign in',            it: 'Accedi' },
  loginLoading:    { fr: 'Connexion...',        en: 'Signing in...',      it: 'Accesso...' },
  loginFailed:     { fr: 'Connexion échouée',  en: 'Login failed',       it: 'Accesso fallito' },
  appTagline:      { fr: 'Planification intelligente des tâches et projets par département', en: 'Intelligent task and project planning by department', it: 'Pianificazione intelligente di attività e progetti per reparto' },
  feat1:           { fr: '✦ Priorisation IA dynamique',  en: '✦ Dynamic AI prioritization', it: '✦ Prioritizzazione IA dinamica' },
  feat2:           { fr: '✦ Sync Google Calendar',       en: '✦ Google Calendar Sync',      it: '✦ Sync Google Calendar' },
  feat3:           { fr: '✦ SLA Manager & Flags',        en: '✦ SLA Manager & Flags',       it: '✦ SLA Manager & Flag' },
  feat4:           { fr: '✦ Base de connaissances auto', en: '✦ Auto Knowledge Base',       it: '✦ Knowledge Base automatica' },

  // ── Navigation ─────────────────────────
  dashboard:    { fr: 'Dashboard',     en: 'Dashboard',    it: 'Dashboard' },
  departments:  { fr: 'Départements',  en: 'Departments',  it: 'Reparti' },
  users:        { fr: 'Utilisateurs',  en: 'Users',        it: 'Utenti' },
  projects:     { fr: 'Projets',       en: 'Projects',     it: 'Progetti' },
  tasks:        { fr: 'Tâches',        en: 'Tasks',        it: 'Attività' },
  flags:        { fr: 'Signalements',  en: 'Flags',        it: 'Segnalazioni' },
  logout:       { fr: 'Déconnexion',   en: 'Logout',       it: 'Esci' },

  // ── Dashboard ──────────────────────────
  welcome:          { fr: 'Bienvenue',           en: 'Welcome',           it: 'Benvenuto' },
  totalTasks:       { fr: 'Total Tâches',        en: 'Total Tasks',       it: 'Totale Attività' },
  doneTasks:        { fr: 'Terminées',           en: 'Completed',         it: 'Completate' },
  blockedTasks:     { fr: 'Bloquées',            en: 'Blocked',           it: 'Bloccate' },
  openFlags:        { fr: 'Flags Ouverts',       en: 'Open Flags',        it: 'Flag Aperti' },
  totalUsers:       { fr: 'Utilisateurs',        en: 'Users',             it: 'Utenti' },
  totalDepts:       { fr: 'Départements',        en: 'Departments',       it: 'Reparti' },
  activeProjects:   { fr: 'Projets Actifs',      en: 'Active Projects',   it: 'Progetti Attivi' },
  completionRate:   { fr: 'Taux Complétion',     en: 'Completion Rate',   it: 'Tasso di Completamento' },
  workloadTitle:    { fr: 'Charge par employé',  en: 'Workload per employee', it: 'Carico per dipendente' },
  employee:         { fr: 'Employé',             en: 'Employee',          it: 'Dipendente' },
  department:       { fr: 'Département',         en: 'Department',        it: 'Reparto' },
  activeTasks:      { fr: 'Tâches actives',      en: 'Active tasks',      it: 'Attività attive' },
  completedTasks:   { fr: 'Terminées',           en: 'Completed',         it: 'Completate' },
  load:             { fr: 'Charge',              en: 'Load',              it: 'Carico' },

  // ── Departments ────────────────────────
  newDept:          { fr: 'Nouveau département', en: 'New department',  it: 'Nuovo reparto' },
  editDept:         { fr: 'Modifier le département', en: 'Edit department', it: 'Modifica reparto' },
  deleteDept:       { fr: 'Supprimer ce département ?', en: 'Delete this department?', it: 'Eliminare questo reparto?' },
  deptOrgSubtitle:  { fr: 'Gérez la structure organisationnelle', en: 'Manage organizational structure', it: 'Gestisci la struttura organizzativa' },
  noDeptDesc:       { fr: 'Aucune description', en: 'No description', it: 'Nessuna descrizione' },
  noDept:           { fr: 'Aucun département', en: 'No departments', it: 'Nessun reparto' },
  noDeptHint:       { fr: 'Créez votre premier département pour commencer', en: 'Create your first department to get started', it: 'Crea il tuo primo reparto per iniziare' },
  color:            { fr: 'Couleur',        en: 'Color',           it: 'Colore' },
  icon:             { fr: 'Icône',          en: 'Icon',            it: 'Icona' },
  manager:          { fr: 'Responsable',    en: 'Manager',         it: 'Responsabile' },
  employees:        { fr: 'employé(s)',     en: 'employee(s)',      it: 'dipendente/i' },
  deptCreated:      { fr: 'Département créé ✓', en: 'Department created ✓', it: 'Reparto creato ✓' },
  deptUpdated:      { fr: 'Département modifié ✓', en: 'Department updated ✓', it: 'Reparto aggiornato ✓' },
  deptDeleted:      { fr: 'Département supprimé ✓', en: 'Department deleted ✓', it: 'Reparto eliminato ✓' },

  // ── Users ──────────────────────────────
  newUser:          { fr: 'Nouvel utilisateur',  en: 'New user',           it: 'Nuovo utente' },
  editUser:         { fr: "Modifier l'utilisateur", en: 'Edit user',       it: 'Modifica utente' },
  deactivateUser:   { fr: 'Désactiver cet utilisateur ?', en: 'Deactivate this user?', it: 'Disattivare questo utente?' },
  deactivateWarn:   { fr: "L'utilisateur ne pourra plus se connecter.", en: 'The user will no longer be able to log in.', it: "L'utente non potrà più accedere." },
  deactivate:       { fr: 'Désactiver', en: 'Deactivate', it: 'Disattiva' },
  fullName:         { fr: 'Nom complet', en: 'Full name',   it: 'Nome completo' },
  role:             { fr: 'Rôle',        en: 'Role',        it: 'Ruolo' },
  allDepts:         { fr: 'Tous les départements', en: 'All departments', it: 'Tutti i reparti' },
  allRoles:         { fr: 'Tous les rôles', en: 'All roles',  it: 'Tutti i ruoli' },
  capacity:         { fr: 'Capacité',   en: 'Capacity',    it: 'Capacità' },
  hoursPerDay:      { fr: 'h/jour',     en: 'h/day',       it: 'h/giorno' },
  active:           { fr: 'Actif',      en: 'Active',      it: 'Attivo' },
  inactive:         { fr: 'Inactif',    en: 'Inactive',    it: 'Inattivo' },
  activeAccounts:   { fr: 'comptes actifs', en: 'active accounts', it: 'account attivi' },
  pwdLeaveBlank:    { fr: '(laisser vide = inchangé)', en: '(leave blank = unchanged)', it: '(lasciare vuoto = invariato)' },
  userCreated:      { fr: 'Utilisateur créé ✓', en: 'User created ✓', it: 'Utente creato ✓' },
  userUpdated:      { fr: 'Utilisateur modifié ✓', en: 'User updated ✓', it: 'Utente aggiornato ✓' },
  userDeactivated:  { fr: 'Utilisateur désactivé ✓', en: 'User deactivated ✓', it: 'Utente disattivato ✓' },
  noUserFound:      { fr: 'Aucun utilisateur trouvé', en: 'No users found', it: 'Nessun utente trovato' },

  // ── Roles ──────────────────────────────
  roleSuperAdmin:   { fr: 'Super Admin',     en: 'Super Admin',     it: 'Super Admin' },
  roleManager:      { fr: 'Manager',         en: 'Manager',         it: 'Manager' },
  roleProjectLead:  { fr: 'Chef de Projet',  en: 'Project Lead',    it: 'Capo Progetto' },
  roleEmployee:     { fr: 'Employé',         en: 'Employee',        it: 'Dipendente' },

  // ── Projects ───────────────────────────
  newProject:       { fr: 'Nouveau projet',   en: 'New project',    it: 'Nuovo progetto' },
  editProject:      { fr: 'Modifier le projet', en: 'Edit project', it: 'Modifica progetto' },
  noProjects:       { fr: 'Aucun projet',     en: 'No projects',    it: 'Nessun progetto' },
  noProjectsHint:   { fr: 'Créez votre premier projet pour commencer', en: 'Create your first project to get started', it: 'Crea il tuo primo progetto per iniziare' },
  noDescription:    { fr: 'Pas de description', en: 'No description', it: 'Nessuna descrizione' },
  priority:         { fr: 'Priorité',         en: 'Priority',       it: 'Priorità' },
  deadline:         { fr: 'Deadline',          en: 'Deadline',       it: 'Scadenza' },
  by:               { fr: 'Par',              en: 'By',             it: 'Di' },
  projectCreated:   { fr: 'Projet créé ✓',   en: 'Project created ✓', it: 'Progetto creato ✓' },
  projectUpdated:   { fr: 'Projet modifié ✓', en: 'Project updated ✓', it: 'Progetto aggiornato ✓' },
  projectArchived:  { fr: 'Projet archivé ✓', en: 'Project archived ✓', it: 'Progetto archiviato ✓' },

  // ── Project statuses ───────────────────
  statusDraft:      { fr: 'Brouillon',  en: 'Draft',     it: 'Bozza' },
  statusActive:     { fr: 'Actif',      en: 'Active',    it: 'Attivo' },
  statusOnHold:     { fr: 'En pause',   en: 'On Hold',   it: 'In Pausa' },
  statusCompleted:  { fr: 'Terminé',    en: 'Completed', it: 'Completato' },
  statusArchived:   { fr: 'Archivé',    en: 'Archived',  it: 'Archiviato' },

  // ── Tasks ──────────────────────────────
  newTask:          { fr: 'Nouvelle tâche',   en: 'New task',       it: 'Nuova attività' },
  noTasks:          { fr: 'Aucune tâche',     en: 'No tasks',       it: 'Nessuna attività' },
  assignedTo:       { fr: 'Assigner à',       en: 'Assign to',      it: 'Assegna a' },
  unassigned:       { fr: '— Non assigné —',  en: '— Unassigned —', it: '— Non assegnato —' },
  importance:       { fr: 'Importance (1-5)', en: 'Importance (1-5)', it: 'Importanza (1-5)' },
  estimation:       { fr: 'Estimation (heures)', en: 'Estimate (hours)', it: 'Stima (ore)' },
  score:            { fr: 'Score',            en: 'Score',          it: 'Punteggio' },
  project:          { fr: 'Projet',           en: 'Project',        it: 'Progetto' },
  choose:           { fr: 'Choisir...',        en: 'Choose...',      it: 'Scegli...' },
  kanban:           { fr: 'Kanban',           en: 'Kanban',         it: 'Kanban' },
  table:            { fr: 'Table',            en: 'Table',          it: 'Tabella' },
  taskCreated:      { fr: 'Tâche créée ✓',   en: 'Task created ✓', it: 'Attività creata ✓' },
  taskUpdated:      { fr: 'Tâche modifiée ✓', en: 'Task updated ✓', it: 'Attività aggiornata ✓' },

  // ── Task statuses ──────────────────────
  todo:             { fr: 'À faire',       en: 'To Do',        it: 'Da fare' },
  in_progress:      { fr: 'En cours',      en: 'In Progress',  it: 'In corso' },
  blocked:          { fr: 'Bloqué',        en: 'Blocked',      it: 'Bloccato' },
  in_review:        { fr: 'En révision',   en: 'In Review',    it: 'In revisione' },
  done:             { fr: 'Terminé',       en: 'Done',         it: 'Fatto' },

  // ── Priority labels ────────────────────
  prioCritical:     { fr: 'Critique',  en: 'Critical',  it: 'Critico' },
  prioHigh:         { fr: 'Haute',     en: 'High',      it: 'Alta' },
  prioMedium:       { fr: 'Moyenne',   en: 'Medium',    it: 'Media' },
  prioLow:          { fr: 'Basse',     en: 'Low',       it: 'Bassa' },

  // ── Flags ──────────────────────────────
  newFlag:          { fr: 'Signaler un problème', en: 'Report an issue', it: 'Segnala un problema' },
  openFlags2:       { fr: 'flags ouverts', en: 'open flags', it: 'flag aperti' },
  allStatuses:      { fr: 'Tous les statuts', en: 'All statuses', it: 'Tutti gli stati' },
  flagTask:         { fr: 'Tâche concernée', en: 'Related task', it: 'Attività correlata' },
  choosTask:        { fr: 'Choisir une tâche...', en: 'Choose a task...', it: 'Scegli un attività...' },
  category:         { fr: 'Catégorie', en: 'Category', it: 'Categoria' },
  urgency:          { fr: 'Urgence',   en: 'Urgency',  it: 'Urgenza' },
  flagDesc:         { fr: 'Description du problème', en: 'Problem description', it: 'Descrizione del problema' },
  flagDescPlaceholder: { fr: 'Décrivez le problème en détail...', en: 'Describe the problem in detail...', it: 'Descrivi il problema in dettaglio...' },
  flagReport:       { fr: '🚩 Signaler', en: '🚩 Report', it: '🚩 Segnala' },
  flagTreat:        { fr: 'Traiter le signalement', en: 'Handle the flag', it: 'Gestisci la segnalazione' },
  problem:          { fr: 'Problème:', en: 'Problem:', it: 'Problema:' },
  solution:         { fr: 'Solution / Résolution', en: 'Solution / Resolution', it: 'Soluzione / Risoluzione' },
  solutionPlaceholder: { fr: 'Décrivez la solution apportée...', en: 'Describe the solution provided...', it: 'Descrivi la soluzione adottata...' },
  markResolved:     { fr: '✓ Marquer résolu', en: '✓ Mark resolved', it: '✓ Segna risolto' },
  closeFlag:        { fr: 'Clôturer', en: 'Close', it: 'Chiudi' },
  noFlags:          { fr: 'Aucun signalement', en: 'No flags', it: 'Nessuna segnalazione' },
  noFlagsHint:      { fr: 'Tout fonctionne bien 🎉', en: 'Everything is running well 🎉', it: 'Tutto funziona bene 🎉' },
  raisedBy:         { fr: 'Signalé par', en: 'Reported by', it: 'Segnalato da' },
  assignedTo2:      { fr: 'Assigné à', en: 'Assigned to', it: 'Assegnato a' },
  flagCreated:      { fr: 'Flag créé — responsable notifié ✓', en: 'Flag created — manager notified ✓', it: 'Flag creato — responsabile notificato ✓' },
  flagResolved:     { fr: 'Flag marqué comme résolu ✓', en: 'Flag marked as resolved ✓', it: 'Flag segnato come risolto ✓' },
  flagClosed:       { fr: 'Flag clôturé — ajouté à la base de connaissances ✓', en: 'Flag closed — added to knowledge base ✓', it: 'Flag chiuso — aggiunto alla knowledge base ✓' },
  resolution:       { fr: 'Résolution:', en: 'Resolution:', it: 'Risoluzione:' },

  // ── Flag statuses ──────────────────────
  flagOpen:         { fr: 'Ouvert',        en: 'Open',        it: 'Aperto' },
  flagInProgress:   { fr: 'En traitement', en: 'In progress', it: 'In corso' },
  flagResolution2:  { fr: 'Résolu',        en: 'Resolved',    it: 'Risolto' },
  flagClosed2:      { fr: 'Clôturé',       en: 'Closed',      it: 'Chiuso' },

  // ── Urgency ────────────────────────────
  urgNormal:   { fr: 'Normal',   en: 'Normal',   it: 'Normale' },
  urgUrgent:   { fr: 'Urgent',   en: 'Urgent',   it: 'Urgente' },
  urgCritical: { fr: 'Critique', en: 'Critical', it: 'Critico' },

  // ── Categories ─────────────────────────
  catTechnical:     { fr: '🔧 Technique',     en: '🔧 Technical',      it: '🔧 Tecnico' },
  catResources:     { fr: '📦 Ressources',    en: '📦 Resources',      it: '📦 Risorse' },
  catCommunication: { fr: '💬 Communication', en: '💬 Communication',  it: '💬 Comunicazione' },
  catExternal:      { fr: '🌐 Externe',       en: '🌐 External',       it: '🌐 Esterno' },

  // ── SLA ────────────────────────────────
  slaOverdue:   { fr: 'Dépassé de', en: 'Overdue by', it: 'Scaduto di' },
  slaLeft:      { fr: 'restantes', en: 'remaining', it: 'rimanenti' },

  // ── Calendar ─────────────────────────────
  calendar:        { fr: 'Calendrier',          en: 'Calendar',            it: 'Calendario' },
  calSubtitle:     { fr: 'Visualisez vos tâches sur le calendrier', en: 'View your tasks on the calendar', it: 'Visualizza le tue attività sul calendario' },
  calToday:        { fr: "Aujourd'hui",         en: 'Today',               it: 'Oggi' },
  calView_month:   { fr: 'Mois',                en: 'Month',               it: 'Mese' },
  calView_week:    { fr: 'Semaine',             en: 'Week',                it: 'Settimana' },
  calView_day:     { fr: 'Jour',                en: 'Day',                 it: 'Giorno' },
  calAllPeople:    { fr: 'Toutes les personnes', en: 'All people',         it: 'Tutte le persone' },
  calScheduled:    { fr: 'planifiées',          en: 'scheduled',           it: 'pianificate' },
  calOverdue:      { fr: 'en retard',           en: 'overdue',             it: 'in ritardo' },
  calMore:         { fr: 'de plus',             en: 'more',                it: 'altri' },
  calTaskDetail:   { fr: 'Détail de la tâche', en: 'Task detail',         it: "Dettaglio dell'attività" },
  calNoTasks:      { fr: 'Aucune tâche planifiée', en: 'No tasks scheduled', it: 'Nessuna attività pianificata' },
  calReset:        { fr: 'Réinitialiser',       en: 'Reset',               it: 'Reimposta' },

  // ── Tasks — Department ──────────────────
  noProjInDept:    { fr: 'Aucun projet dans ce département', en: 'No project in this department', it: 'Nessun progetto in questo reparto' },
  filterByDept:    { fr: 'Filtrer par département', en: 'Filter by department', it: 'Filtra per reparto' },

  // ── Flags — Enhanced form ──────────────
  detectedBy:      { fr: 'Détecté par',            en: 'Detected by',          it: 'Rilevato da' },
  resolutionResp:  { fr: 'Responsable résolution',  en: 'Resolution responsible', it: 'Responsabile risoluzione' },
  autoAssign:      { fr: 'Auto (manager département)', en: 'Auto (dept. manager)', it: 'Auto (responsabile reparto)' },
  flagLink:        { fr: 'Lien de référence',       en: 'Reference link',       it: 'Link di riferimento' },
  flagFiles:       { fr: 'Pièces jointes',          en: 'Attachments',          it: 'Allegati' },
  flagDropFiles:   { fr: 'Cliquer pour ajouter des fichiers', en: 'Click to add files', it: 'Clicca per aggiungere file' },
  flagAttachments: { fr: 'Pièces jointes',          en: 'Attachments',          it: 'Allegati' },

  // ── CRUD Actions ──────────────────────
  edit:            { fr: 'Modifier',                en: 'Edit',                 it: 'Modifica' },
  delete:          { fr: 'Supprimer',               en: 'Delete',               it: 'Elimina' },
  save:            { fr: 'Enregistrer',             en: 'Save',                 it: 'Salva' },
  confirmDelete:   { fr: 'Confirmer la suppression', en: 'Confirm deletion',    it: 'Conferma eliminazione' },
  confirmDeleteMsg: { fr: 'Êtes-vous sûr de vouloir supprimer cet élément ? Cette action est irréversible.', en: 'Are you sure you want to delete this item? This action cannot be undone.', it: 'Sei sicuro di voler eliminare questo elemento? Questa azione è irreversibile.' },
  editTask:        { fr: 'Modifier la tâche',       en: 'Edit task',            it: 'Modifica attività' },
  taskUpdated:     { fr: 'Tâche modifiée ✓',        en: 'Task updated ✓',       it: 'Attività aggiornata ✓' },
  taskDeleted:     { fr: 'Tâche supprimée ✓',       en: 'Task deleted ✓',       it: 'Attività eliminata ✓' },
  editFlag:        { fr: 'Modifier le signalement',  en: 'Edit flag',           it: 'Modifica segnalazione' },
  flagUpdated:     { fr: 'Signalement modifié ✓',   en: 'Flag updated ✓',      it: 'Segnalazione aggiornata ✓' },
  flagDeleted:     { fr: 'Signalement supprimé ✓',  en: 'Flag deleted ✓',      it: 'Segnalazione eliminata ✓' },
  actions:         { fr: 'Actions',                  en: 'Actions',             it: 'Azioni' },

  // ── Calendar — Type filter ────────────
  calTypeAll:      { fr: 'Tout',                     en: 'All',                 it: 'Tutto' },
  calTypeTasks:    { fr: 'Tâches',                   en: 'Tasks',               it: 'Attività' },
  calTypeFlags:    { fr: 'Signalements',             en: 'Flags',               it: 'Segnalazioni' },
  calFlagSla:      { fr: 'SLA',                      en: 'SLA',                 it: 'SLA' },
  calFlagCreated:  { fr: 'Créé le',                  en: 'Created on',          it: 'Creato il' },
  flagAttachments: { fr: 'Pièces jointes',           en: 'Attachments',         it: 'Allegati' },
  taskLink:        { fr: 'Lien',                     en: 'Link',                it: 'Collegamento' },
  taskLinkPlaceholder: { fr: 'https://...',          en: 'https://...',         it: 'https://...' },
  taskFiles:       { fr: 'Fichiers joints',          en: 'Attached files',      it: 'File allegati' },
  taskDropFiles:   { fr: 'Glissez ou cliquez pour ajouter des fichiers', en: 'Drag or click to add files', it: 'Trascina o clicca per aggiungere file' },

  // ── User Filter ────────────────────────
  allUsers:        { fr: 'Tous les utilisateurs',    en: 'All users',           it: 'Tutti gli utenti' },
  filterByUser:    { fr: 'Filtrer par utilisateur',  en: 'Filter by user',      it: 'Filtra per utente' },

  // ── Archives / Accumulation ────────────
  showArchives:    { fr: '📦 Archives',              en: '📦 Archives',          it: '📦 Archivio' },
  hideArchives:    { fr: '✕ Masquer archives',       en: '✕ Hide archives',      it: '✕ Nascondi archivio' },
  archivedTasks:   { fr: 'tâches archivées',         en: 'archived tasks',       it: 'attività archiviate' },
  archivedFlags:   { fr: 'signalements archivés',    en: 'archived flags',       it: 'segnalazioni archiviate' },
  showingArchived: { fr: 'Affichage des archives',   en: 'Showing archives',     it: 'Visualizzazione archivio' },
  onlyActive:      { fr: 'Actifs uniquement',        en: 'Active only',          it: 'Solo attivi' },

  // ── Pagination ─────────────────────────
  showing:         { fr: 'Affichage',                en: 'Showing',              it: 'Visualizzazione' },
  of:              { fr: 'sur',                      en: 'of',                   it: 'di' },
  page:            { fr: 'page',                     en: 'page',                 it: 'pagina' },
};

// ── Language Store (simple localStorage) ──
export function getLang() {
  return localStorage.getItem('st_lang') || 'fr';
}

export function setLang(code) {
  localStorage.setItem('st_lang', code);
  window.dispatchEvent(new Event('lang-change'));
}

// ── Translation function ───────────────────
export function t(key) {
  const lang = getLang();
  const entry = translations[key];
  if (!entry) return key;
  return entry[lang] || entry['fr'] || key;
}

export default translations;
