"""
Locustfile for Experimento 2 — Booking → Catalog → PostgreSQL (SELECT FOR UPDATE)

Validates: p95 < 1.5s under peak load on the synchronous HTTP chain.
Target: POST /api/bookings/checkout-start
"""

import random
import threading
import uuid
from datetime import date, timedelta

from locust import HttpUser, between, events, task

# ---------------------------------------------------------------------------
# Room catalog (from seed.sql — 20 room_types across 5 properties)
# Each tuple: (property_id, room_type_id, rate_plan_id)
# ---------------------------------------------------------------------------
ROOM_CATALOG = [
    # Property 1: Hotel Bogotá Plaza
    ("a0000000-0000-0000-0000-000000000001", "b0000000-0000-0000-0000-000000000001",
     "c0000000-0000-0000-0000-000000000001"),
    ("a0000000-0000-0000-0000-000000000001", "b0000000-0000-0000-0000-000000000002",
     "c0000000-0000-0000-0000-000000000002"),
    ("a0000000-0000-0000-0000-000000000001", "b0000000-0000-0000-0000-000000000003",
     "c0000000-0000-0000-0000-000000000003"),
    ("a0000000-0000-0000-0000-000000000001", "b0000000-0000-0000-0000-000000000004",
     "c0000000-0000-0000-0000-000000000004"),
    # Property 2: Hotel Medellín Royal
    ("a0000000-0000-0000-0000-000000000002", "b0000000-0000-0000-0000-000000000005",
     "c0000000-0000-0000-0000-000000000005"),
    ("a0000000-0000-0000-0000-000000000002", "b0000000-0000-0000-0000-000000000006",
     "c0000000-0000-0000-0000-000000000006"),
    ("a0000000-0000-0000-0000-000000000002", "b0000000-0000-0000-0000-000000000007",
     "c0000000-0000-0000-0000-000000000007"),
    ("a0000000-0000-0000-0000-000000000002", "b0000000-0000-0000-0000-000000000008",
     "c0000000-0000-0000-0000-000000000008"),
    # Property 3: Hotel Cartagena Bay
    ("a0000000-0000-0000-0000-000000000003", "b0000000-0000-0000-0000-000000000009",
     "c0000000-0000-0000-0000-000000000009"),
    ("a0000000-0000-0000-0000-000000000003", "b0000000-0000-0000-0000-000000000010",
     "c0000000-0000-0000-0000-000000000010"),
    ("a0000000-0000-0000-0000-000000000003", "b0000000-0000-0000-0000-000000000011",
     "c0000000-0000-0000-0000-000000000011"),
    ("a0000000-0000-0000-0000-000000000003", "b0000000-0000-0000-0000-000000000012",
     "c0000000-0000-0000-0000-000000000012"),
    # Property 4: Hotel Cali Garden
    ("a0000000-0000-0000-0000-000000000004", "b0000000-0000-0000-0000-000000000013",
     "c0000000-0000-0000-0000-000000000013"),
    ("a0000000-0000-0000-0000-000000000004", "b0000000-0000-0000-0000-000000000014",
     "c0000000-0000-0000-0000-000000000014"),
    ("a0000000-0000-0000-0000-000000000004", "b0000000-0000-0000-0000-000000000015",
     "c0000000-0000-0000-0000-000000000015"),
    ("a0000000-0000-0000-0000-000000000004", "b0000000-0000-0000-0000-000000000016",
     "c0000000-0000-0000-0000-000000000016"),
    # Property 5: Hotel Santa Marta Sol
    ("a0000000-0000-0000-0000-000000000005", "b0000000-0000-0000-0000-000000000017",
     "c0000000-0000-0000-0000-000000000017"),
    ("a0000000-0000-0000-0000-000000000005", "b0000000-0000-0000-0000-000000000018",
     "c0000000-0000-0000-0000-000000000018"),
    ("a0000000-0000-0000-0000-000000000005", "b0000000-0000-0000-0000-000000000019",
     "c0000000-0000-0000-0000-000000000019"),
    ("a0000000-0000-0000-0000-000000000005", "b0000000-0000-0000-0000-000000000020",
     "c0000000-0000-0000-0000-000000000020"),
]

# These 3 room_types receive 80% of traffic to maximize row-lock contention.
HOT_ROOMS = [ROOM_CATALOG[0], ROOM_CATALOG[4], ROOM_CATALOG[8]]
COLD_ROOMS = [r for r in ROOM_CATALOG if r not in HOT_ROOMS]

# Date pool — 4 overlapping check-in dates with 2-night stays
CHECKIN_POOL = [date(2026, 3, 1) + timedelta(days=i) for i in range(4)]
STAY_NIGHTS = 2


def pick_room():
    """80% chance of picking a HOT room, 20% COLD."""
    if random.random() < 0.8:
        return random.choice(HOT_ROOMS)
    return random.choice(COLD_ROOMS)


def pick_dates():
    """Pick a random check-in from the pool, checkout = checkin + STAY_NIGHTS."""
    checkin = random.choice(CHECKIN_POOL)
    checkout = checkin + timedelta(days=STAY_NIGHTS)
    return checkin.isoformat(), checkout.isoformat()


error_counts = {"409": 0, "504": 0, "502": 0, "other": 0}
error_lock = threading.Lock()


def bump_error(category):
    with error_lock:
        error_counts[category] += 1


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("\n" + "=" * 60)
    print("ERROR BREAKDOWN")
    print("=" * 60)
    with error_lock:
        for cat, count in error_counts.items():
            print(f"  {cat:>8s}: {count}")
    print("=" * 60 + "\n")


class BookingUser(HttpUser):
    host = "http://exp2-alb-1508349404.us-east-1.elb.amazonaws.com"
    wait_time = between(1, 3)

    def on_start(self):
        self.user_id = str(uuid.uuid4())

    @task
    def checkout_start(self):
        prop_id, room_id, rate_id = pick_room()
        checkin, checkout = pick_dates()

        payload = {
            "user_id": self.user_id,
            "property_id": prop_id,
            "room_type_id": room_id,
            "rate_plan_id": rate_id,
            "checkin": checkin,
            "checkout": checkout,
            "quantity": 1,
        }

        with self.client.post(
            "/api/bookings/checkout-start",
            json=payload,
            catch_response=True,
        ) as resp:
            if resp.status_code == 201:
                resp.success()
            elif resp.status_code == 409:
                bump_error("409")
                resp.failure("409 No inventory")
            elif resp.status_code == 504:
                bump_error("504")
                resp.failure("504 Timeout")
            elif resp.status_code == 502:
                bump_error("502")
                resp.failure("502 Catalog error")
            else:
                bump_error("other")
                resp.failure(f"{resp.status_code} Unexpected")
