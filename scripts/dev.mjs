import net from 'node:net';
import { spawn } from 'node:child_process';

const DEFAULT_PORTS = {
    CLIENT_PORT: 3000,
    DOCS_PORT: 3001,
    PORT: 4000,
};

async function isPortFree(port) {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', () => resolve(false));
        server.once('listening', () => {
            server.close(() => resolve(true));
        });

        server.listen(port, '0.0.0.0');
    });
}

async function findAvailablePort(startPort, reservedPorts = new Set()) {
    let port = startPort;

    while (reservedPorts.has(port) || !(await isPortFree(port))) {
        port += 1;
    }

    return port;
}

const reservedPorts = new Set();
const clientPort = await findAvailablePort(
    Number(process.env.CLIENT_PORT || DEFAULT_PORTS.CLIENT_PORT),
    reservedPorts,
);
reservedPorts.add(clientPort);

const docsPort = await findAvailablePort(
    Number(process.env.DOCS_PORT || DEFAULT_PORTS.DOCS_PORT),
    reservedPorts,
);
reservedPorts.add(docsPort);

const serverPort = await findAvailablePort(
    Number(process.env.PORT || DEFAULT_PORTS.PORT),
    reservedPorts,
);

const child = spawn(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['exec', 'turbo', 'dev'],
    {
        stdio: 'inherit',
        env: {
            ...process.env,
            CLIENT_PORT: String(clientPort),
            DOCS_PORT: String(docsPort),
            PORT: String(serverPort),
            NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL || `http://localhost:${serverPort}`,
        },
    },
);

console.log(
    `[dev] client=http://localhost:${clientPort} docs=http://localhost:${docsPort} server=http://localhost:${serverPort}`,
);

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }

    process.exit(code ?? 0);
});
