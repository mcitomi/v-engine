console.log("Hello via Bun!");

import { port } from "../config.json"
import { Database } from "bun:sqlite";
import { RequestHandler } from "./web/handler";


const db: Database = new Database("../db.sqlite", { create: true });

const requesthandler: RequestHandler = new RequestHandler(db);

requesthandler.register();  // Regist requests

// Handle request
Bun.serve({
    // development: true,
    port: port,
    async fetch(r: Request, server) {
        // server.up
        return await requesthandler.listener(r);
    },
    websocket: {
        message(ws, message) { }, // a message is received
        open(ws) { }, // a socket is opened
        close(ws, code, message) { }, // a socket is closed
        drain(ws) { }, // the socket is ready to receive more data
    },
});

console.log("🌐 Port: " + port);    