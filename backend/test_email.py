import sys, os, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
os.chdir(os.path.dirname(__file__))

from email_notifications import notify_task_overdue, notify_task_status_changed

USERS = [
    ("zahrouni.aymen@benozzi.com", "Aymen Zahrouni"),
    ("oussama.dhouib@benozzi.com", "Oussama Dhouib"),
    ("wiem.hsairi@benozzi.com", "Wiem Hsairi"),
    ("louaybenhamda@benozzi.com", "Louay Ben Hamda"),
    ("hamdi.saidi@benozzi.com", "Hamdi Saidi"),
    ("aladinbenmahmoud@benozzi.com", "Aladin Ben Mahmoud"),
    ("med.salah.bouagga@benozzi.com", "Med Salah Bouagga"),
    ("firas.hajjem@benozzi.com", "Firas Hajjem"),
    ("berradhi.riadh@benozzi.com", "Riadh Berradhi"),
    ("Jebali.Nizar@benozzi.com", "Nizar Jebali"),
    ("Bouslah.Souhail@benozzi.com", "Souhail Bouslah"),
    ("Agerbi.Adam@benozzi.com", "Adam Agerbi"),
    ("Benturkia.Marwen@benozzi.com", "Marwen Benturkia"),
]

print("=" * 60)
print("  TEST 1 : RAPPEL DEADLINE DEPASSEE (13 users)")
print("=" * 60)

for i, (email, name) in enumerate(USERS):
    print(f"  [{i+1}/13] Rappel -> {name}...", end=" ", flush=True)
    notify_task_overdue(
        to_email=email,
        to_name=name,
        task={
            'title': 'Mise a jour documentation projet',
            'description': 'Cette tache devait etre terminee. Merci de la completer rapidement.',
            'status': 'in_progress',
            'deadline': '22/04/2026 17:00',
        },
        days_overdue=1,
    )
    print("OK!")
    time.sleep(2)

print()
print("=" * 60)
print("  TEST 2 : TACHE TERMINEE (13 users)")
print("=" * 60)

for i, (email, name) in enumerate(USERS):
    print(f"  [{i+1}/13] Termine -> {name}...", end=" ", flush=True)
    notify_task_status_changed(
        to_email=email,
        to_name=name,
        task={'title': 'Installation SmartTask Pro'},
        changer_name="Wiem Hsairi",
        old_status="in_progress",
        new_status="done",
    )
    print("OK!")
    time.sleep(2)

print()
print("=" * 60)
print("  TERMINE : 26 emails envoyes (13 rappels + 13 termine)")
print("=" * 60)
