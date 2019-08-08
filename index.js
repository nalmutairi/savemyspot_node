var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http);
var axios = require("axios");

const instance = axios.create({
  // baseURL: "http://127.0.0.1:8000/"
  baseURL: "https://savemyspot-django.codeunicorn.io/"
});

function getMyQ(socket, restaurantID) {
  instance
    .get(`/queue/list/`, { data: { restaurant: restaurantID } })
    .then(res => res.data)
    .then(queue => {
      // console.log("RET", queue);
      socket.join(queue.id);
      io.to(socket.id).emit("restaurantQ", queue);
    })
    .catch(err => console.error(err));
}

function getRestaurantQ(socket, restaurantID, user) {
  instance
    .get(`queue/list/`, { data: { restaurant: restaurantID } })
    .then(res => res.data)
    .then(queue => {
      socket.join(queue.id);
      let found = false;
      if (queue.length > 0) {
        queue.forEach(spot => {
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
          restaurantQ: queue[0].position
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

app.use(function(req, res, next) {
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://savemyspot-restaurant.netlify.com/"
  );
  next();
});

io.on("connection", function(socket) {
  users = {};
  socket.on("restaurant room", function(data) {
    // console.log("HERE");
    socket.join(data.restaurant.id);
    getRestaurantQ(socket, data.restaurant.id, data.user);
  });

  socket.on("join q", function(data) {
    instance
      .post("queue/create/", data)
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
    instance
      .delete(`queue/delete/${data.id}/`)
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
    instance
      .delete(`queue/delete/${data}/`)
      .then(res => res.data)
      .then(restaurant => {
        // io.to(socket.id).emit("restaurantQ", restaurant.queue);
        io.sockets.in(restaurant.id).emit("update queue");
      })
      .catch(err => console.error(err));
  });
});

http.listen(3000, function() {
  console.log("Listening on port 3000");
});
