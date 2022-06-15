const ws = new WebSocket("ws://localhost:3000");

ws.onmessage = (d) => {
  var reader = new FileReader();
  reader.onload = function () {
    console.log("data from server : ", reader.result);
  };
  reader.readAsText(d.data);
};

ws.onopen = (d) => {
  console.log("opened");
  console.log(d);

  ws.send("hi server");
};
