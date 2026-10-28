# Mu Reforge web client - production runbook

The runbook (provisioning, hardening, the steps on both realms, verification, monitoring,
rollback, kill switch, risks) lives in the **private** game server repository:
`mu-reforge-server/deploy/prod/WEB-CLIENT-RUNBOOK.md`, next to `WEB-CLIENT.md` and
`DEPLOY-FLOW.md`.

This repository is public. Hostnames of the admin panels, logins, the VPN layout and firewall
exemption lists do not belong here - keep them in that file.

**Forbidden on every box:** `install/get.sh`, `install/install.sh`, the `mu` CLI (`mu adopt` and
friends) and `docker/compose.yml` of this repo.
