# Overview: Client and Server

> This is a tiny tic-tac-toe game built to show one thing: how a client and a
> server talk to each other.

---

## Quick start (try this first)

With the server running (`./run.sh`), open a second terminal and run these
commands, one at a time:

```bash
curl http://localhost:8000/
curl http://localhost:8000/games/new
curl http://localhost:8000/games/1/player/X/move/1
curl http://localhost:8000/games/1/player/O/move/2
curl http://localhost:8000/games/1
```

Each command is one request and one response. Running these five commands plays
a full game from the client side. If the boards came back in the terminal, a
complete request → response cycle just happened. That exchange is the entire
client-server model; the rest of this guide just names the parts.

---

## The one idea to remember

A **client** and a **server** are just two programs talking to each other.

- The **client** asks for something.
- The **server** answers.

There are only two roles here: one asks, one answers. Everything below is
detail on top of those two roles. In this project:

- The **server** is the FastAPI app (everything in `src/app/`).
- The **client** is `curl`, a command-line tool that sends requests and prints
  the responses it receives.

A `curl` command is the client side of the conversation. The server code stays
put on the machine running the app; the client never "goes into" the server. It
just sends a message and reads the reply.

### The client-server model

```
  CLIENT                    SERVER
  (curl)                  (FastAPI app)
    │                         │
    │  1. sends a request     │
    │  "GET /games/new"       │
    │ ───────────────────────▶│
    │                         │  creates the game,
    │                         │  draws the board
    │  2. sends a response    │
    │  ◀───────────────────────│  the board as text
    ▼                         ▼
```

Every interaction follows this same shape: a request in, a response out.

### A real conversation

Think of it like exchanging texts:

```
Client (curl):   "GET /games/new please"
Server:          "Okay, here is a brand-new game. It's game #1."
```

```
Client (curl):   "GET /games/1/player/X/move/1 please"
Server:          "Got it, X just played the top-left corner. Here's the board."
```

---

## What exactly is in a request?

A request is basically a URL plus an action. For example:

```
curl http://localhost:8000/games/1/player/X/move/1
```

| Piece | Example | Meaning |
| ----- | ------- | ------- |
| **Base URL** | `http://localhost:8000` | Where the server lives. `localhost` means "this same machine", `8000` is the door number (port). |
| **Path** | `/games/1/player/X/move/1` | *Which thing* to access and *what to do* with it. |
| **Method** | `GET` | The *kind* of request. `GET` just means "fetch / do something and give me the result." |

A **path** is like an address for a specific action. `/games/new` means "make a
new game". `/games/1/player/X/move/1` means "in game 1, have player X move to
square 1".

### How a URL is read

```
http://localhost:8000 /games/1/player/X/move/1
└────────────────────┘ └────────────────────────┘
       base URL                path
   where the server            which action
       lives                   to perform
```

---

## Where does the request actually go?

When a request arrives, FastAPI looks at the path and hands it to the function
that matches. This diagram follows one request through the code:

```
GET /games/1/player/X/move/1
            │
            ▼
  FastAPI matches the path
            │
            ▼
  main.py  →  make_move()
            │
            ▼
  does the work
  (checks whose turn, places the X, checks for a win)
            │
            ▼
  returns the board as the response
```

`main.py` is the server's "receiving desk." Each URL listed in the README
corresponds to one function there.

For a file-by-file breakdown of how the server is organized, and how a request
flows through it, see `FAST-API.md`.

## The client has no code to write here

There is deliberately no client code in this project. The client is `curl`, a
tool that already exists, so the focus stays entirely on the server side —
which is what this project demonstrates. The server is where the interesting
work happens.

## The server does all the real work

The server:

- creates games,
- remembers each game's board and whose turn it is,
- checks whether a move is legal,
- draws the board as text.

The client just *asks* and *shows the answer*. A good mental shortcut:
**the client asks, the server does.**

---

## Wait — isn't my computer the server?

"Server" is a role, not a machine. A server is simply whatever program answers
requests — and it can run on any computer. In this project the FastAPI app is
the server program. When you ran `./run.sh`, your computer is just the machine
that happens to be *running* that program. It isn't "the server"; it's a
computer running the server program.

Because client and server are roles, the same app can run on a different
machine. For a real two-player game, the typical setup is one server program
running on one computer, with two separate client programs — on two other
computers — connecting to it to play the same game:

```
   Computer A                 Computer B                 Computer C
   curl (client 1)   ───────▶ FastAPI app (server) ◀───────  curl (client 2)
        │                one shared game                   │
        └────────── both players talk to the same game ────┘
```

The key idea: the server is the program, not the machine. Move that program to
another computer and the clients just point at that computer's address instead —
the roles never change.

---

## A tiny vocabulary box

- **Client** — the program that asks. Here: `curl`.
- **Server** — the program that answers and does the work. Here: the FastAPI app.
- **Request** — the question sent (the URL + method).
- **Response** — the answer received (the text/board).
- **Endpoint** — a fancy word for "one specific URL/path the server understands."
- **URL / path** — the address that says which endpoint is being hit.
- **Port** — the "door number" a server listens on. Here it is `8000`.
- **HTTP** — the language both sides speak when they talk. A request and its
  response are an HTTP exchange.

---

## A web browser can be a client too

`curl` is not the only client. A web browser works the same way: every time a
URL is typed and Enter is pressed, the browser sends a request to a server and
shows the response. The difference is that the browser *renders* what comes
back into a page.

```
CLIENT (curl)      CLIENT (browser)       SERVER
     │                    │                   │
     │  same request      │  same request     │
     └────────────────────┴──────────────────▶│  /games/new
                                              │
     │  same response     │  rendered page    │
     ◀────────────────────┴───────────────────│
```

Opening `http://localhost:8000/games/new` in a browser tab shows the same board
that `curl` displays — same request, same server, just a different client
rendering it.

`curl` is used first because it shows the raw request/response with nothing
hidden. But whether the client is `curl`, a browser, or any app, **client and
server always talk the same way — request in, response out.**

---

## Next: how the backend is put together

This guide covered the one big idea — client and server. To look inside the
server and see how the FastAPI code is organized file by file, read
`FAST-API.md` (also served at `/FAST-API.md`).
