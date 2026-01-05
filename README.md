## Ephemeral

A real time self destructing anonymous chat application designed for private temporary conversations. Rooms expire automatically, messages vanish without a trace, and identities remain hidden.


## Tech Stack

Next.js
Redis
Upstash Realtime
TypeScript
Tailwind CSS

## How It Works

A user creates a room and receives a unique invite link.
The first two users who open the link are allowed entry.
A secure session token is issued via httpOnly cookies.
Messages are transmitted in real time and stored temporarily in Redis.
When the room expires all data is permanently deleted.
