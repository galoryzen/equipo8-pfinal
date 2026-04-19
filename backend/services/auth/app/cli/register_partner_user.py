"""Admin CLI: create HOTEL/AGENCY user linked to an existing organization.

Run from services/auth with PYTHONPATH including the service root, e.g.:

  cd backend/services/auth
  set PYTHONPATH=.
  python -m app.cli.register_partner_user --first-name Ana --last-name López ...
"""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
import uuid

from app.adapters.outbound.db.session import async_session
from app.adapters.outbound.db.user_repository import SqlAlchemyUserRepository
from app.application.use_cases.admin_register_partner_user import AdminRegisterPartnerUserUseCase
from app.schemas.admin_partner import AdminPartnerRegisterRequest


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Register a partner user (HOTEL or AGENCY).")
    p.add_argument("--first-name", required=True)
    p.add_argument("--last-name", required=True)
    p.add_argument("--phone", required=True)
    p.add_argument("--email", required=True)
    p.add_argument("--country-code", required=True)
    p.add_argument("--password", required=True)
    p.add_argument("--organization-type", required=True, choices=["HOTEL", "AGENCY"])
    p.add_argument("--organization-id", required=True, type=uuid.UUID)
    return p


async def _run(args: argparse.Namespace) -> int:
    req = AdminPartnerRegisterRequest(
        first_name=args.first_name,
        last_name=args.last_name,
        phone=args.phone,
        email=args.email,
        country_code=args.country_code,
        password=args.password,
        organization_type=args.organization_type,
        organization_id=args.organization_id,
    )
    async with async_session() as session:
        repo = SqlAlchemyUserRepository(session)
        uc = AdminRegisterPartnerUserUseCase(repo)
        result = await uc.execute(
            first_name=req.first_name,
            last_name=req.last_name,
            phone=req.phone,
            email=req.email,
            country_code=req.country_code,
            password=req.password,
            organization_type=req.organization_type,
            organization_id=req.organization_id,
        )
    print(json.dumps(result, indent=2))
    return 0


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()
    try:
        code = asyncio.run(_run(args))
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
    else:
        sys.exit(code)


if __name__ == "__main__":
    main()
