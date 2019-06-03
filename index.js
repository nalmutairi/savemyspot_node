var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var axios = require("axios");

function getMyQ(socket, restaurantID) {
  axios
    .get(`http://127.0.0.1:8000/restaurant/detail/${restaurantID}/`)
    .then(res => res.data)
    .then(restaurant => {
      socket.join(restaurant.id);
      io.to(socket.id).emit("restaurantQ", restaurant);
    })
    .catch(err => console.error(err));
}

function getRestaurantQ(socket, restaurantID, user) {
  axios
    .get(`http://127.0.0.1:8000/restaurant/detail/${restaurantID}/`, {
      params: { restaurant: restaurantID }
    })
    .then(res => res.data)
    .then(restaurant => {
      socket.join(restaurant.id);
      let found = false;

      if (restaurant.queue.length > 0) {
        restaurant.queue.forEach(spot => {
          if (user !== null && spot.user.id === user) {
            io.to(socket.id).emit("user spot", {
              spot: spot
            });
            found = true;
          }
        });

        if (!found) {
          io.to(socket.id).emit("user spot", {
            spot: null
          });
        }
        io.to(socket.id).emit("q info", {
          restaurantQ: restaurant.queue[0].position
        });
      } else {
        io.to(socket.id).emit("q info", {
          restaurantQ: 0
        });
        io.to(socket.id).emit("user spot", {
          spot: null
        });
      }
    })
    .catch(err => console.error(err));
}

io.on("connection", function(socket) {
  users = {};
  socket.on("restaurant room", function(data) {
    socket.join(data.restaurant.id);
    getRestaurantQ(socket, data.restaurant.id, data.user);
  });

  socket.on("join q", function(data) {
    axios
      .post("http://127.0.0.1:8000/queue/create/", data)
      .then(res => res.data)
      .then(restaurant => {
        io.sockets.in(restaurant.id).emit("restaurantQ", restaurant);
        io.sockets.in(restaurant.id).emit("update queue");
      })
      .catch(err => console.error(err));
  });

  socket.on("back", function(data) {
    socket.leave(data);
  });

  socket.on("leave q", function(data) {
    axios
      .delete("http://127.0.0.1:8000/queue/delete/" + data.id + "/")
      .then(res => {
        io.sockets.in(res.data.id).emit("restaurantQ", res.data);
        io.sockets.in(res.data.id).emit("update queue");
      })
      .catch(err => console.error(err));
  });

  socket.on("restaurant request", data => {
    socket.join(data);
    getMyQ(socket, data);
  });

  socket.on("seat guest", data => {
    axios
      .delete(`http://127.0.0.1:8000/queue/delete/${data}/`)
      .then(res => res.data)
      .then(restaurant => {
        io.to(socket.id).emit("restaurantQ", restaurant.queue);
        io.sockets.in(restaurant.id).emit("update queue");
      })
      .catch(err => console.error(err));
  });
});

http.listen(3000, function() {
  console.log("Listening on port 3000");
});
