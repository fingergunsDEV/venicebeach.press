import { createApp } from "./app.js";
const port = Number(process.env.PORT || 3001);
createApp({ channel: "press" }).listen(port, "0.0.0.0", (error) => {
  if (error) {
    console.error(error.message);
    process.exit(1);
  }
  console.log("VeniceBeach.press listening on port " + port);
});
