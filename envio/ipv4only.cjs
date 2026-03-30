const { Agent, setGlobalDispatcher } = require("undici");

// Force IPv4 for all undici/fetch HTTP(S) traffic in this process.
setGlobalDispatcher(new Agent({ connect: { family: 4 } }));
