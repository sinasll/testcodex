export const DEFAULT_ROLES = [
  'Townsperson',
  'Sheriff',
  'Doctor',
  'Lookout',
  'Vigilante',
  'Bodyguard',
  'Godfather',
  'Mafioso',
  'Consigliere',
  'Serial Killer',
  'Jester',
  'Survivor',
];

export const ALIGNMENTS = {
  Townsperson: 'town',
  Sheriff: 'town',
  Doctor: 'town',
  Lookout: 'town',
  Vigilante: 'town',
  Bodyguard: 'town',
  Godfather: 'mafia',
  Mafioso: 'mafia',
  Consigliere: 'mafia',
  'Serial Killer': 'neutral-killing',
  Jester: 'neutral-chaos',
  Survivor: 'neutral-benign',
};

export const NIGHT_PRIORITY = [
  'roleblocks_jail',
  'investigations',
  'lookout_tracker',
  'protections',
  'mafia_kill',
  'other_killers',
  'death_application',
  'on_death_triggers',
];

export function isInvestigative(role) {
  return ['Sheriff', 'Consigliere'].includes(role);
}

export function isProtective(role) {
  return ['Doctor', 'Bodyguard', 'Survivor'].includes(role);
}

export function isKiller(role) {
  return ['Mafioso', 'Godfather', 'Vigilante', 'Serial Killer'].includes(role);
}
