# Dashboard Access

Phase3 introduces the first Dashboard access model.

## Roles

- `viewer`: can read Dashboard data.
- `admin`: can change guild settings.
- `owner`: can manage Dashboard access.

Role checks are hierarchical. `owner` satisfies `admin` and `viewer`, and `admin`
satisfies `viewer`.

## Owner

`owner` is not granted through Dashboard access rows. A user is `owner` when
their Discord user id matches the Discord server owner's user id for that guild.

This means Dashboard access does not require `/setup` for the server owner.

## Admin And Viewer Grants

`admin` and `viewer` are explicit Dashboard grants for allowed Discord users or
Discord roles.

- `admin`: can view Dashboard data and change settings.
- `viewer`: can view Dashboard data only.

When a user matches multiple grants, the highest grant wins.

## Storage

Dashboard grants are stored in `dashboard_access_grants`.

- `guild_id` stores the Discord guild id as text.
- `target_type` is `user` or `role`.
- `target_id` stores the Discord user id or Discord role id.
- `role` is text with a database check for `viewer` and `admin`.
- Each `(guild_id, target_type, target_id)` pair is unique.

## Phase3 Boundaries

This issue defines the role model and persistence. Page/API enforcement is
handled separately in #49. Access-management UI is not part of this issue.
