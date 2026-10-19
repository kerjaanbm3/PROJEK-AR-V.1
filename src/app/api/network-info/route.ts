import { NextResponse } from 'next/server';
import os from 'os';

export async function GET() {
  try {
    const nets = os.networkInterfaces();
    const addresses: { name: string; ip: string }[] = [];

    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          addresses.push({ name, ip: net.address });
        }
      }
    }

    // Prioritize Wi-Fi or Ethernet interfaces
    const primary =
      addresses.find(
        (a) =>
          a.name.toLowerCase().includes('wi-fi') ||
          a.name.toLowerCase().includes('wifi')
      ) ||
      addresses.find((a) => a.name.toLowerCase().includes('ethernet')) ||
      addresses[0];

    return NextResponse.json({
      localIp: primary?.ip || 'localhost',
      addresses,
      port: 3000
    });
  } catch (error) {
    return NextResponse.json({ localIp: 'localhost', port: 3000 });
  }
}
