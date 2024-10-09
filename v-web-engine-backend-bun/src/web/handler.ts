import fs from "node:fs";
import { Database } from "bun:sqlite";

type Endpoint = {
    route: string;
    name: string;
    type: string;
}

export class RequestHandler {
    private endpoints: Endpoint[] = [];
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    public async listener(req: Request) {
        const request_url = (new URL(req.url).pathname).toLowerCase();

        const api_prefix = "/api";

        // console.log(request_url.slice(api_prefix.length));

        if (request_url.startsWith(api_prefix)) {
            const endpoint = this.endpoints.find(endpoint => endpoint.name.toLowerCase() === (request_url.slice(api_prefix.length).endsWith("/") ? request_url.slice(api_prefix.length).slice(0, -1) : request_url.slice(api_prefix.length)) && endpoint.type.toUpperCase() === req.method.toUpperCase());
            
            if (endpoint) {
                const file = require(`${endpoint?.route}`);
                return await file.handleRequest(req, this.db);
            } else {
                return new Response(`{"message":"invalid endpoint or wrong method used"}`, { status: 404 });
            }

        } else if (request_url.startsWith("/assets")) {
            const root = process.cwd() + "/public" + request_url;

            if (fs.existsSync(root) && fs.statSync(root).isFile()) {
                try {
                    // return new Response(await Bun.file(root).text(), {headers: { "Content-Type": Bun.file(root).type }});
                    return new Response(Bun.file(root));
                } catch (error) {
                    return new Response(`{"message":"an error occurred while sending the file", "err": "${error}"}`, { status: 404 });
                }
            } else {
                return new Response(`{"message":"file not found"}`, { status: 404 });
            }

        } else {
            const root = process.cwd() + "/src/web/pages" + (request_url.endsWith("/") ? request_url : request_url + "/");
            console.log(root);
            

            if (fs.existsSync(root + "index.html")) {
                return new Response(await Bun.file(root + "index.html").text(), {headers: { "Content-Type": "text/html" }});
            } else {
                return Response.redirect("/", 302);
            }
        }
    }

    public register() {
        fs.readdirSync(import.meta.dir + "/methods/").map((method: string) => {
            if (!method.endsWith('.ts')) {
                fs.readdirSync(import.meta.dir + `/methods/${method}/`).map((fileName: string) => {
                    scanSubFolders(fileName, import.meta.dir + `/methods/${method}/`, method, this.endpoints);
                });
            }
        });

        function scanSubFolders(item: string, path: string, method: string, endpoints: Endpoint[]) {
            fs.stat(path + item, (err, stats) => {
                if (err) {
                    console.error(`Endpoint register error: ${err}`);
                } else {
                    if (stats.isDirectory()) {
                        fs.readdirSync(path + item).map((file: string) => {
                            scanSubFolders(file, path + item + "/", method, endpoints);
                        });
                    } else if (stats.isFile()) {
                        const route = path + item;
                        const name = route.slice(route.indexOf(method) + method.length).split('.')[0];
                        const type = method;
                        console.info(`📜 ${method}\t${name} loaded!`);
                        endpoints.push({ route, name, type });
                    }
                }
            });
        }
    }
}
