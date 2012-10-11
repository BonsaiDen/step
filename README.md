Lockstep Multiplayer Server
===========================

This is really just incomplete code demoing some kind of "gaming network" which 
is build upon a lock step based multiplayer approach.

Given the high pings with WebSockets and other limitations, this should mostly 
be suited for turnbased games.


## Components

There's no UI at the moment, also there's only a really small amount of client 
side code that handles most of the lock step action stuff.

So testing is doine via explicit console calls to `client.send` and passing in 
the correct Network Command IDs and data.


### Login

Right now the system has no login valdiation (I'll add some preliminary persona 
support for demoing purposes soon though).


### Chat

There exist channels (2 hard coded at the moment) and one can chat in channels 
/ lobbies and games and send whispers to other players.


### Lobbies

Lobbies are a sort pre-stage for games where players can select options, teams and so on.

Now note, there's no real code on the server to handle any of this, the clients 
will have to implement everything.

In theory, the lock step based approach will make this work and should also 
prevent cheating to some extend (of course, it should be *relatively* easy to 
validate actions on the server too, but client side only code should speed up the devlopment quite a bit)


### Games

After a lobby has launched (all players marked themselfs as ready and the 
countdown ended), players a added to a game and some basic network data is 
send down (e.g. RNG init values).

From there on the server only communicates the actions between different players.

1. Player `A` sends a action `1`
2. Server relays action `1` to all players, client side code *verfies* the action to be allowed, and client *accepts* or *rejects* it.
3. Server waits for all players to accept / reject
4. Server now tells clients to either ignore the action if >= 50% of them have rejected an action or tells them to execute it

The action queue is a FIFO at the moment and all players can only have one action pending at a time.

## TODOS

- Login system
- Handling user timeouts (right now users just get removed when they reload the page)
- Handling timeouts of action accepton / rejection / completion (users should be kicked in that case)

