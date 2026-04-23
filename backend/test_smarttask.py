"""
══════════════════════════════════════════════
 SmartTask Pro — Tests Unitaires + Seed Data
══════════════════════════════════════════════
Ce script :
  1. Teste TOUS les endpoints de l'API
  2. Crée des données d'exemple réalistes
  3. Affiche un rapport de test complet
"""
import requests
import sys
import json
from datetime import datetime, timedelta

BASE = "http://localhost:8150/api"
PASS = 0
FAIL = 0
RESULTS = []

# ═══════════════════════════════════════════
#  HELPERS
# ═══════════════════════════════════════════

def test(name, method, path, expected_status=200, body=None, token=None, params=None):
    global PASS, FAIL
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    url = f"{BASE}{path}"
    try:
        if method == "GET":
            r = requests.get(url, headers=headers, params=params, timeout=10)
        elif method == "POST":
            r = requests.post(url, headers=headers, json=body, timeout=10)
        elif method == "PUT":
            r = requests.put(url, headers=headers, json=body, timeout=10)
        elif method == "DELETE":
            r = requests.delete(url, headers=headers, timeout=10)
        
        ok = r.status_code == expected_status
        if ok:
            PASS += 1
            status = "✅ PASS"
        else:
            FAIL += 1
            status = f"❌ FAIL (got {r.status_code}, expected {expected_status})"
        
        data = None
        try:
            data = r.json()
        except:
            pass
        
        RESULTS.append({"name": name, "status": status, "ok": ok})
        print(f"  {status}  {name}")
        return data
    except Exception as e:
        FAIL += 1
        RESULTS.append({"name": name, "status": f"❌ ERROR: {e}", "ok": False})
        print(f"  ❌ ERROR  {name}: {e}")
        return None


def section(title):
    print(f"\n{'═'*60}")
    print(f"  {title}")
    print(f"{'═'*60}")


# ═══════════════════════════════════════════
#  1. AUTH TESTS
# ═══════════════════════════════════════════

section("1. AUTHENTIFICATION")

# Test login avec mauvais identifiants
test("Login mauvais email", "POST", "/auth/login",
     expected_status=401,
     body={"email": "nobody@test.com", "password": "wrong"})

test("Login mauvais password", "POST", "/auth/login",
     expected_status=401,
     body={"email": "admin@smarttask.local", "password": "wrongpassword"})

# Login admin
admin_data = test("Login admin", "POST", "/auth/login",
     expected_status=200,
     body={"email": "admin@smarttask.local", "password": "admin123"})

if not admin_data or "access_token" not in admin_data:
    print("\n❌ ERREUR FATALE: Impossible de se connecter en admin!")
    print("   Vérifiez que le backend tourne sur le port 8150")
    sys.exit(1)

TOKEN = admin_data["access_token"]
ADMIN_ID = admin_data["user"]["id"]
print(f"     → Token obtenu, Admin ID = {ADMIN_ID}")

# Test /auth/me
me = test("GET /auth/me", "GET", "/auth/me", token=TOKEN)
print(f"     → Utilisateur: {me['full_name']} ({me['role']})")

# Test sans token
test("Accès non autorisé (sans token)", "GET", "/auth/me", expected_status=401)


# ═══════════════════════════════════════════
#  2. DEPARTMENTS
# ═══════════════════════════════════════════

section("2. DÉPARTEMENTS — CRUD")

departments_data = [
    {"name": "Ingénierie", "description": "Équipe de développement logiciel et infrastructure", "color": "#6366f1", "icon": "⚙️"},
    {"name": "Marketing", "description": "Stratégie marketing, communication et branding", "color": "#ec4899", "icon": "📢"},
    {"name": "Finance", "description": "Comptabilité, budget et reporting financier", "color": "#10b981", "icon": "💰"},
    {"name": "RH", "description": "Ressources humaines, recrutement et formation", "color": "#f59e0b", "icon": "👥"},
    {"name": "Design", "description": "UX/UI Design et expérience produit", "color": "#8b5cf6", "icon": "🎨"},
    {"name": "Commercial", "description": "Ventes, CRM et relations clients", "color": "#ef4444", "icon": "🤝"},
]

dept_ids = []
for d in departments_data:
    result = test(f"Créer département: {d['name']}", "POST", "/departments",
                  expected_status=201, body=d, token=TOKEN)
    if result:
        dept_ids.append(result["id"])
        print(f"     → ID: {result['id']}")

# Test doublon
test("Dept doublon (doit échouer)", "POST", "/departments",
     expected_status=400, body=departments_data[0], token=TOKEN)

# Lister
depts = test("Lister tous les départements", "GET", "/departments", token=TOKEN)
print(f"     → {len(depts)} départements trouvés")

# Modifier
if dept_ids:
    test("Modifier département Marketing", "PUT", f"/departments/{dept_ids[1]}",
         body={"description": "Marketing digital & Growth Hacking", "color": "#d946ef"},
         token=TOKEN)

# Test département inexistant
test("Modifier dept inexistant", "PUT", "/departments/9999",
     expected_status=404, body={"name": "X"}, token=TOKEN)


# ═══════════════════════════════════════════
#  3. USERS
# ═══════════════════════════════════════════

section("3. UTILISATEURS — CRUD")

users_data = [
    {"email": "marie.dupont@smarttask.local", "full_name": "Marie Dupont", "role": "manager", "department_id": dept_ids[0] if dept_ids else 1, "password": "test123", "daily_capacity": 8},
    {"email": "jean.martin@smarttask.local", "full_name": "Jean Martin", "role": "project_lead", "department_id": dept_ids[0] if dept_ids else 1, "password": "test123", "daily_capacity": 7},
    {"email": "sophie.bernard@smarttask.local", "full_name": "Sophie Bernard", "role": "employee", "department_id": dept_ids[1] if len(dept_ids) > 1 else 1, "password": "test123", "daily_capacity": 8},
    {"email": "luc.morel@smarttask.local", "full_name": "Luc Morel", "role": "employee", "department_id": dept_ids[1] if len(dept_ids) > 1 else 1, "password": "test123", "daily_capacity": 6},
    {"email": "claire.petit@smarttask.local", "full_name": "Claire Petit", "role": "manager", "department_id": dept_ids[2] if len(dept_ids) > 2 else 1, "password": "test123", "daily_capacity": 8},
    {"email": "thomas.robert@smarttask.local", "full_name": "Thomas Robert", "role": "employee", "department_id": dept_ids[2] if len(dept_ids) > 2 else 1, "password": "test123", "daily_capacity": 8},
    {"email": "emma.leroy@smarttask.local", "full_name": "Emma Leroy", "role": "project_lead", "department_id": dept_ids[3] if len(dept_ids) > 3 else 1, "password": "test123", "daily_capacity": 7},
    {"email": "nicolas.moreau@smarttask.local", "full_name": "Nicolas Moreau", "role": "employee", "department_id": dept_ids[4] if len(dept_ids) > 4 else 1, "password": "test123", "daily_capacity": 8},
    {"email": "julie.simon@smarttask.local", "full_name": "Julie Simon", "role": "employee", "department_id": dept_ids[4] if len(dept_ids) > 4 else 1, "password": "test123", "daily_capacity": 8},
    {"email": "paul.laurent@smarttask.local", "full_name": "Paul Laurent", "role": "employee", "department_id": dept_ids[5] if len(dept_ids) > 5 else 1, "password": "test123", "daily_capacity": 7},
]

user_ids = [ADMIN_ID]  # Admin already exists
for u in users_data:
    result = test(f"Créer user: {u['full_name']}", "POST", "/users",
                  expected_status=201, body=u, token=TOKEN)
    if result:
        user_ids.append(result["id"])
        print(f"     → ID: {result['id']}, Role: {result['role']}")

# Test doublon email
test("User email doublon", "POST", "/users",
     expected_status=400, body=users_data[0], token=TOKEN)

# Lister users
users = test("Lister tous les users", "GET", "/users", token=TOKEN)
print(f"     → {len(users)} utilisateurs actifs")

# Modifier user
if len(user_ids) > 2:
    test("Modifier capacité de Jean", "PUT", f"/users/{user_ids[2]}",
         body={"daily_capacity": 10}, token=TOKEN)

# Login avec un autre user
user_login = test("Login avec Marie Dupont", "POST", "/auth/login",
     body={"email": "marie.dupont@smarttask.local", "password": "test123"})
USER_TOKEN = user_login["access_token"] if user_login else TOKEN

# Assigner managers aux départements
if dept_ids and len(user_ids) > 1:
    test("Assigner manager Ingénierie", "PUT", f"/departments/{dept_ids[0]}",
         body={"manager_id": user_ids[1]}, token=TOKEN)
if len(dept_ids) > 2 and len(user_ids) > 5:
    test("Assigner manager Finance", "PUT", f"/departments/{dept_ids[2]}",
         body={"manager_id": user_ids[5]}, token=TOKEN)


# ═══════════════════════════════════════════
#  4. PROJECTS
# ═══════════════════════════════════════════

section("4. PROJETS — CRUD")

projects_data = [
    {
        "title": "Migration Cloud AWS",
        "description": "Migrer l'infrastructure on-premise vers AWS. Inclut EC2, RDS, S3 et CloudFront.",
        "department_id": dept_ids[0] if dept_ids else 1,
        "priority_weight": 5,
        "deadline": (datetime.now() + timedelta(days=60)).strftime("%Y-%m-%d"),
    },
    {
        "title": "App Mobile V2",
        "description": "Refonte complète de l'application mobile avec React Native et nouveau design system.",
        "department_id": dept_ids[0] if dept_ids else 1,
        "priority_weight": 4,
        "deadline": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"),
    },
    {
        "title": "Campagne Été 2026",
        "description": "Campagne marketing multi-canal pour le lancement estival. SEO, SEM, réseaux sociaux.",
        "department_id": dept_ids[1] if len(dept_ids) > 1 else 1,
        "priority_weight": 4,
        "deadline": (datetime.now() + timedelta(days=45)).strftime("%Y-%m-%d"),
    },
    {
        "title": "Audit Financier Q2",
        "description": "Préparation et conduite de l'audit financier du deuxième trimestre 2026.",
        "department_id": dept_ids[2] if len(dept_ids) > 2 else 1,
        "priority_weight": 5,
        "deadline": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
    },
    {
        "title": "Programme Onboarding",
        "description": "Nouveau programme d'intégration pour les recrues. Formation 30/60/90 jours.",
        "department_id": dept_ids[3] if len(dept_ids) > 3 else 1,
        "priority_weight": 3,
        "deadline": (datetime.now() + timedelta(days=120)).strftime("%Y-%m-%d"),
    },
    {
        "title": "Refonte Design System",
        "description": "Créer un design system unifié pour toutes les applications de l'entreprise.",
        "department_id": dept_ids[4] if len(dept_ids) > 4 else 1,
        "priority_weight": 4,
        "deadline": (datetime.now() + timedelta(days=75)).strftime("%Y-%m-%d"),
    },
    {
        "title": "CRM Salesforce Setup",
        "description": "Déploiement et configuration de Salesforce pour l'équipe commerciale.",
        "department_id": dept_ids[5] if len(dept_ids) > 5 else 1,
        "priority_weight": 3,
        "deadline": (datetime.now() + timedelta(days=50)).strftime("%Y-%m-%d"),
    },
]

project_ids = []
for p in projects_data:
    result = test(f"Créer projet: {p['title']}", "POST", "/projects",
                  expected_status=201, body=p, token=TOKEN)
    if result:
        project_ids.append(result["id"])
        print(f"     → ID: {result['id']}, Priorité: {result['priority_weight']}")

# Lister projets
projects = test("Lister tous les projets", "GET", "/projects", token=TOKEN)
print(f"     → {len(projects)} projets trouvés")

# Modifier projet
if project_ids:
    test("Modifier projet App Mobile V2", "PUT", f"/projects/{project_ids[1]}",
         body={"description": "Refonte mobile V2 avec Flutter - pivot technologique"}, token=TOKEN)

# Test projet inexistant
test("Modifier projet inexistant", "PUT", "/projects/9999",
     expected_status=404, body={"title": "X"}, token=TOKEN)

# Filtrer par département
if dept_ids:
    filtered = test("Filtrer projets par département", "GET", f"/projects?department_id={dept_ids[0]}",
                     token=TOKEN)
    if filtered:
        print(f"     → {len(filtered)} projets dans Ingénierie")


# ═══════════════════════════════════════════
#  5. TASKS
# ═══════════════════════════════════════════

section("5. TÂCHES — CRUD")

tasks_data = [
    # Migration Cloud (projet 1)
    {"title": "Audit infrastructure existante", "description": "Cartographier tous les serveurs, bases de données et services existants", "project_id": 0, "assigned_to_idx": 2, "importance": 5, "estimated_hours": 16, "days_offset": 7},
    {"title": "Setup VPC et réseau AWS", "description": "Configurer le VPC, subnets, security groups et NAT gateway", "project_id": 0, "assigned_to_idx": 2, "importance": 5, "estimated_hours": 8, "days_offset": 14},
    {"title": "Migration base de données RDS", "description": "Migrer PostgreSQL vers Amazon RDS avec réplication", "project_id": 0, "assigned_to_idx": 1, "importance": 4, "estimated_hours": 24, "days_offset": 21},
    {"title": "Tests de charge", "description": "Exécuter tests de charge avec JMeter sur la nouvelle infra", "project_id": 0, "assigned_to_idx": 2, "importance": 3, "estimated_hours": 12, "days_offset": 30},
    
    # App Mobile V2 (projet 2)
    {"title": "Wireframes V2", "description": "Créer tous les wireframes pour les 15 écrans principaux", "project_id": 1, "assigned_to_idx": 8, "importance": 4, "estimated_hours": 20, "days_offset": 10},
    {"title": "Développer auth biométrique", "description": "Implémenter Face ID / Fingerprint avec expo-local-authentication", "project_id": 1, "assigned_to_idx": 2, "importance": 5, "estimated_hours": 16, "days_offset": 20},
    {"title": "Intégration API REST", "description": "Connecter tous les endpoints API avec le frontend mobile", "project_id": 1, "assigned_to_idx": 2, "importance": 4, "estimated_hours": 32, "days_offset": 35},
    {"title": "Tests E2E mobile", "description": "Écrire et exécuter tests Detox pour iOS et Android", "project_id": 1, "assigned_to_idx": 1, "importance": 3, "estimated_hours": 24, "days_offset": 45},
    
    # Campagne Été (projet 3)
    {"title": "Brief créatif", "description": "Rédiger le brief créatif avec positionnement et messages clés", "project_id": 2, "assigned_to_idx": 3, "importance": 5, "estimated_hours": 8, "days_offset": 5},
    {"title": "Création visuels réseaux sociaux", "description": "Designer 20 visuels adaptés Instagram, LinkedIn et Twitter", "project_id": 2, "assigned_to_idx": 8, "importance": 4, "estimated_hours": 24, "days_offset": 15},
    {"title": "Setup Google Ads", "description": "Configurer campagnes Search et Display sur Google Ads", "project_id": 2, "assigned_to_idx": 4, "importance": 4, "estimated_hours": 12, "days_offset": 20},
    {"title": "Rédaction articles blog", "description": "Écrire 5 articles SEO pour le blog corporate", "project_id": 2, "assigned_to_idx": 3, "importance": 3, "estimated_hours": 20, "days_offset": 25},
    
    # Audit Financier (projet 4)
    {"title": "Collecte documents comptables", "description": "Rassembler tous les documents comptables du Q2", "project_id": 3, "assigned_to_idx": 6, "importance": 5, "estimated_hours": 16, "days_offset": 5},
    {"title": "Rapprochement bancaire", "description": "Vérifier la concordance entre les relevés bancaires et la comptabilité", "project_id": 3, "assigned_to_idx": 5, "importance": 5, "estimated_hours": 12, "days_offset": 10},
    {"title": "Préparation bilan intermédiaire", "description": "Établir le bilan intermédiaire au 30 juin", "project_id": 3, "assigned_to_idx": 6, "importance": 4, "estimated_hours": 20, "days_offset": 15},
    
    # Programme Onboarding (projet 5)
    {"title": "Créer parcours formation digital", "description": "Développer le contenu e-learning sur la plateforme LMS", "project_id": 4, "assigned_to_idx": 7, "importance": 4, "estimated_hours": 30, "days_offset": 30},
    {"title": "Guide du nouvel employé", "description": "Rédiger le guide d'accueil PDF interactif", "project_id": 4, "assigned_to_idx": 7, "importance": 3, "estimated_hours": 16, "days_offset": 20},
    
    # Design System (projet 6)
    {"title": "Inventaire composants existants", "description": "Auditer tous les composants UI utilisés dans les apps", "project_id": 5, "assigned_to_idx": 8, "importance": 5, "estimated_hours": 12, "days_offset": 7},
    {"title": "Créer tokens de design", "description": "Définir couleurs, typographies, espacements et bordures", "project_id": 5, "assigned_to_idx": 9, "importance": 5, "estimated_hours": 16, "days_offset": 14},
    {"title": "Bibliothèque Figma", "description": "Construire la bibliothèque de composants dans Figma", "project_id": 5, "assigned_to_idx": 8, "importance": 4, "estimated_hours": 40, "days_offset": 30},
    
    # CRM Salesforce (projet 7)
    {"title": "Configuration objets Salesforce", "description": "Paramétrer les objets Account, Contact, Opportunity", "project_id": 6, "assigned_to_idx": 10, "importance": 4, "estimated_hours": 20, "days_offset": 10},
    {"title": "Import données clients", "description": "Migrer la base clients existante vers Salesforce", "project_id": 6, "assigned_to_idx": 10, "importance": 5, "estimated_hours": 16, "days_offset": 20},
    {"title": "Formation équipe commerciale", "description": "Former les 8 commerciaux à l'utilisation de Salesforce", "project_id": 6, "assigned_to_idx": 10, "importance": 3, "estimated_hours": 12, "days_offset": 30},
]

task_ids = []
for t in tasks_data:
    pid = project_ids[t["project_id"]] if t["project_id"] < len(project_ids) else project_ids[0]
    aid = user_ids[t["assigned_to_idx"]] if t["assigned_to_idx"] < len(user_ids) else user_ids[0]
    deadline = (datetime.now() + timedelta(days=t["days_offset"])).isoformat()
    
    body = {
        "title": t["title"],
        "description": t["description"],
        "project_id": pid,
        "assigned_to": aid,
        "importance": t["importance"],
        "estimated_hours": t["estimated_hours"],
        "deadline": deadline,
    }
    result = test(f"Créer tâche: {t['title'][:40]}...", "POST", "/tasks",
                  expected_status=201, body=body, token=TOKEN)
    if result:
        task_ids.append(result["id"])

print(f"     → {len(task_ids)} tâches créées au total")

# Modifier status de certaines tâches
status_updates = [
    (0, "in_progress"),   # Audit infra → en cours
    (1, "in_progress"),   # Setup VPC → en cours
    (4, "done"),          # Wireframes → terminé
    (8, "in_progress"),   # Brief créatif → en cours
    (12, "done"),         # Collecte docs → terminé
    (13, "in_progress"),  # Rapprochement → en cours
    (17, "in_progress"),  # Inventaire composants → en cours
]

for idx, status in status_updates:
    if idx < len(task_ids):
        test(f"Tâche #{task_ids[idx]} → {status}", "PUT", f"/tasks/{task_ids[idx]}",
             body={"status": status}, token=TOKEN)

# Lister tâches
all_tasks = test("Lister toutes les tâches", "GET", "/tasks", token=TOKEN)
print(f"     → {len(all_tasks)} tâches au total")

# Mes tâches (admin)
my_tasks = test("GET /tasks/my (admin)", "GET", "/tasks/my", token=TOKEN)
print(f"     → {len(my_tasks)} tâches pour admin")

# Mes tâches (Marie)
my_tasks_marie = test("GET /tasks/my (Marie)", "GET", "/tasks/my", token=USER_TOKEN)
print(f"     → {len(my_tasks_marie)} tâches pour Marie")

# Filtrer par projet
if project_ids:
    filtered = test("Filtrer tâches par projet", "GET", f"/tasks?project_id={project_ids[0]}", token=TOKEN)
    if filtered:
        print(f"     → {len(filtered)} tâches dans Migration Cloud")

# Filtrer par statut
filtered = test("Filtrer tâches in_progress", "GET", "/tasks?status=in_progress", token=TOKEN)
if filtered:
    print(f"     → {len(filtered)} tâches en cours")

# Test supprimer tâche
if task_ids:
    last_task = task_ids[-1]
    test("Supprimer dernière tâche", "DELETE", f"/tasks/{last_task}", token=TOKEN)
    task_ids.pop()


# ═══════════════════════════════════════════
#  6. FLAGS (Blocages)
# ═══════════════════════════════════════════

section("6. FLAGS (BLOCAGES)")

flags_data = [
    {"task_id_idx": 1, "category": "technical", "urgency": "urgent", "description": "Accès AWS console bloqué — les credentials IAM ne fonctionnent pas. Impossible de continuer le setup VPC."},
    {"task_id_idx": 6, "category": "external", "urgency": "normal", "description": "L'API tierce pour la géolocalisation ne répond plus depuis 2 jours. En attente du support."},
    {"task_id_idx": 10, "category": "resources", "urgency": "critical", "description": "Budget Google Ads non approuvé par la direction. Campagne en attente d'approbation."},
    {"task_id_idx": 14, "category": "communication", "urgency": "normal", "description": "Le cabinet d'audit externe n'a pas encore envoyé les templates de reporting."},
]

flag_ids = []

# If task_ids is empty, fetch from API
if not task_ids and all_tasks:
    task_ids = [t["id"] for t in all_tasks]
    print(f"     (Fallback: récupéré {len(task_ids)} task IDs depuis l'API)")

if task_ids:
    for f in flags_data:
        tid = task_ids[f["task_id_idx"]] if f["task_id_idx"] < len(task_ids) else task_ids[0]
        body = {
            "task_id": tid,
            "category": f["category"],
            "urgency": f["urgency"],
            "description": f["description"],
        }
        result = test(f"Créer flag ({f['urgency']}): {f['description'][:40]}...", "POST", "/flags",
                      expected_status=201, body=body, token=TOKEN)
        if result:
            flag_ids.append(result["id"])
            print(f"     → Flag ID: {result['id']}, SLA: {result.get('sla_deadline', 'N/A')}")
else:
    print("  ⚠️  Pas de tâches disponibles, flags ignorés")

# Lister flags
flags = test("Lister tous les flags", "GET", "/flags", token=TOKEN)
print(f"     → {len(flags)} flags actifs")

# Filtrer par status
open_flags = test("Filtrer flags ouverts", "GET", "/flags?status=open", token=TOKEN)
print(f"     → {len(open_flags)} flags ouverts")

# Résoudre un flag
if flag_ids:
    test("Résoudre flag #1", "PUT", f"/flags/{flag_ids[0]}",
         body={"status": "resolved", "resolution": "Nouveaux credentials IAM créés par l'admin AWS. Problème de rotation de clés."},
         token=TOKEN)
    
    # Fermer le flag résolu
    test("Fermer flag #1", "POST", f"/flags/{flag_ids[0]}/close", token=TOKEN)


# ═══════════════════════════════════════════
#  7. KNOWLEDGE BASE
# ═══════════════════════════════════════════

section("7. BASE DE CONNAISSANCES")

knowledge = test("Rechercher dans la KB", "GET", "/knowledge", token=TOKEN)
print(f"     → {len(knowledge)} entrées dans la KB")

knowledge_search = test("Rechercher 'IAM'", "GET", "/knowledge?q=IAM", token=TOKEN)
print(f"     → {len(knowledge_search)} résultat(s) pour 'IAM'")


# ═══════════════════════════════════════════
#  8. DASHBOARD / STATS
# ═══════════════════════════════════════════

section("8. DASHBOARD & STATISTIQUES")

stats = test("GET /dashboard/stats", "GET", "/dashboard/stats", token=TOKEN)
if stats:
    print(f"     → Tâches totales: {stats['total_tasks']}")
    print(f"     → Tâches terminées: {stats['done_tasks']}")
    print(f"     → Tâches bloquées: {stats['blocked_tasks']}")
    print(f"     → Flags ouverts: {stats['open_flags']}")
    print(f"     → Taux de complétion: {stats['completion_rate']}%")
    print(f"     → Utilisateurs actifs: {stats['total_users']}")
    print(f"     → Projets actifs: {stats['total_projects']}")

heatmap = test("GET /dashboard/heatmap", "GET", "/dashboard/heatmap", token=TOKEN)
if heatmap:
    print(f"     → {len(heatmap)} utilisateurs dans la heatmap")
    for h in heatmap[:5]:
        load_emoji = "🟢" if h["load_pct"] < 50 else "🟡" if h["load_pct"] < 80 else "🔴"
        print(f"       {load_emoji} {h['full_name']}: {h['active_tasks']} actives, {h['load_pct']}% charge")


# ═══════════════════════════════════════════
#  9. NOTIFICATIONS
# ═══════════════════════════════════════════

section("9. NOTIFICATIONS")

notifs = test("Lister notifications", "GET", "/notifications", token=TOKEN)
print(f"     → {len(notifs)} notifications")

# Test marquer comme lu avec un ID inexistant (devrait quand même retourner 200)
test("Marquer notification inexistante", "PUT", "/notifications/9999/read", token=TOKEN)


# ═══════════════════════════════════════════
#  10. ATTACHMENTS
# ═══════════════════════════════════════════

section("10. PIÈCES JOINTES")

attachments = test("Lister attachments", "GET", "/attachments", token=TOKEN)
print(f"     → {len(attachments)} fichiers")


# ═══════════════════════════════════════════
#  11. EDGE CASES & SÉCURITÉ
# ═══════════════════════════════════════════

section("11. EDGE CASES & SÉCURITÉ")

# Token invalide
test("Token invalide", "GET", "/auth/me", expected_status=401,
     token="invalid-token-123")

# Créer dept sans être admin (avec token employee)
emp_login = test("Login employee (Sophie)", "POST", "/auth/login",
     body={"email": "sophie.bernard@smarttask.local", "password": "test123"})
EMP_TOKEN = emp_login["access_token"] if emp_login else None

if EMP_TOKEN:
    test("Employee crée dept (interdit)", "POST", "/departments",
         expected_status=403,
         body={"name": "Test Dept"},
         token=EMP_TOKEN)
    
    test("Employee crée user (interdit)", "POST", "/users",
         expected_status=403,
         body={"email": "hack@test.com", "full_name": "Hacker"},
         token=EMP_TOKEN)

# Supprimer dept avec employés (doit échouer)
if dept_ids:
    test("Supprimer dept avec employés (interdit)", "DELETE", f"/departments/{dept_ids[0]}",
         expected_status=400, token=TOKEN)

# Tâche avec projet inexistant
test("Tâche projet inexistant", "POST", "/tasks",
     expected_status=500,
     body={"title": "Test", "project_id": 9999, "importance": 3},
     token=TOKEN)


# ═══════════════════════════════════════════
#  12. TESTS DE PERFORMANCE (Listage)
# ═══════════════════════════════════════════

section("12. PERFORMANCE — Temps de réponse")

import time

endpoints = [
    ("GET /departments", "/departments"),
    ("GET /users", "/users"),
    ("GET /projects", "/projects"),
    ("GET /tasks", "/tasks"),
    ("GET /flags", "/flags"),
    ("GET /dashboard/stats", "/dashboard/stats"),
    ("GET /dashboard/heatmap", "/dashboard/heatmap"),
    ("GET /knowledge", "/knowledge"),
    ("GET /notifications", "/notifications"),
]

for name, path in endpoints:
    start = time.time()
    requests.get(f"{BASE}{path}", headers={"Authorization": f"Bearer {TOKEN}"})
    elapsed = (time.time() - start) * 1000
    speed = "🟢" if elapsed < 100 else "🟡" if elapsed < 300 else "🔴"
    print(f"  {speed} {name}: {elapsed:.0f}ms")


# ═══════════════════════════════════════════
#  RAPPORT FINAL
# ═══════════════════════════════════════════

section("RAPPORT FINAL")
total = PASS + FAIL
print(f"""
  ╔══════════════════════════════════╗
  ║   SmartTask Pro — Test Report    ║
  ╠══════════════════════════════════╣
  ║  Total tests:    {total:>4}            ║
  ║  ✅ Réussis:     {PASS:>4}            ║
  ║  ❌ Échoués:     {FAIL:>4}            ║
  ║  Taux succès:   {PASS/max(total,1)*100:>5.1f}%          ║
  ╠══════════════════════════════════╣
  ║  Données créées:                 ║
  ║  📁 Départements: {len(dept_ids):>3}             ║
  ║  👤 Utilisateurs: {len(user_ids):>3}             ║
  ║  📋 Projets:      {len(project_ids):>3}             ║
  ║  ✏️  Tâches:       {len(task_ids):>3}             ║
  ║  🚩 Flags:        {len(flag_ids):>3}             ║
  ╚══════════════════════════════════╝
""")

if FAIL > 0:
    print("  Tests échoués:")
    for r in RESULTS:
        if not r["ok"]:
            print(f"    ❌ {r['name']}: {r['status']}")

print(f"\n  Terminé à {datetime.now().strftime('%H:%M:%S')}")
sys.exit(0 if FAIL == 0 else 1)
