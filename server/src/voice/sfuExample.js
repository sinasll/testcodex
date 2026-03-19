export function buildIceServers(env) {
  const servers = [];
  if (env.STUN_SERVER) servers.push({ urls: env.STUN_SERVER });
  if (env.TURN_SERVER) {
    servers.push({
      urls: env.TURN_SERVER,
      username: env.TURN_USERNAME,
      credential: env.TURN_PASSWORD,
    });
  }
  return servers;
}

export const jitsiExample = {
  enabledByDefault: false,
  notes: 'Set SFU_PROVIDER=jitsi and SFU_JITSI_DOMAIN to offload mesh voice for rooms above 8 players.',
};

export const mediasoupExample = {
  enabledByDefault: false,
  notes: 'Set SFU_PROVIDER=mediasoup and deploy worker nodes with UDP/TCP ports exposed.',
};
