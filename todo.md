# TODO List - Admin Interface Issues

# HUMAN
* switch to new redis client without legacy mode
* Test user registration. Does it work without sendgrid?
* change/improve login captche mechanism
* redis cleanup could be useful for playwright tests as well
* create a docker build workflow
  * Add that container to the docker-compose.yml as well as the main README
* fix/test for websocket issue in docker compose environment (on local runs, doesn't happen on server)
* Reduce dockerfile steps, maybe we can remove the apt-get calls?
* When i save an updated discription of a room, the room is reset. That is not needed.
* The song page indicator at the button is ugly, the one at the top is ugly when the page count gets to high.
* Feature ideas:
  * Import albums
  * Sort by different columns in room view
  * 