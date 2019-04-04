var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var axios = require("axios");

let users = {};
let restaurantQ = {};

app.get("/", (req, res) => {
  res.send("Hello World!");
});

io.on("connection", function(socket) {
  users = {};
  console.log("CONNECTION", socket.id);

  socket.on("restaurant room", function(data) {
    socket.join(data.restaurant.id);

    axios
      .get(
        "http://127.0.0.1:8000/api/restaurant/detail/" +
          data.restaurant.id +
          "/"
      )
      .then(res => res.data)
      .then(restaurant => {
        if (restaurant.queue[0]) {
          io.to(socket.id).emit("q info", restaurant.queue[0].position);
          restaurantQ[restaurant.id] = restaurant.queue;
          console.log("testing", restaurantQ[restaurant.id]);
          let que = [];
          restaurantQ[data.restaurant.id].forEach(restaurant => {
            que.push(restaurant.position);
          });
        }
      })
      .catch(err => console.error(err));

    socket.user = data.user;
    socket.restaurant = data.restaurant.id;

    if (users[socket.restaurant] === undefined) {
      users[socket.restaurant] = [socket.user];
    } else {
      users[socket.restaurant].push(socket.user);
    }
  });

  //when joining the q, update the restaurantQ locally to all,
  //then once restaurant is accessed it fetches from the backend
  //need to send user q information back -- to know q position

  socket.on("join q", function(data) {
    axios
      .post("http://127.0.0.1:8000/api/queue/create/", data)
      .then(res => res.data)
      .then(userQ => {
        if (restaurantQ[userQ.restaurant] === undefined) {
          restaurantQ[userQ.restaurant] = [userQ];
        } else {
          restaurantQ[userQ.restaurant].unshift(userQ);
        }
        io.to(socket.id).emit("user position", userQ);
        io.sockets
          .in(data.restaurant)
          .emit("q info", restaurantQ[data.restaurant][0].position);
      })
      .catch(err => console.error(err));
  });

  io.emit("testing", "whatup");
});

http.listen(3000, function() {
  console.log("Listening on port 3000");
});
