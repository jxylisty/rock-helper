export const leaderFormPetIds = [
  4,
  7,
  10,
  20,
  29,
  40,
  48,
  84,
  110,
  115,
  117,
  122,
  131,
  144,
  200,
  204,
  228,
  286
]

export const leaderFormPetIdSet = new Set(leaderFormPetIds.map((id) => Number(id)))

export function hasLeaderFormPetId(id) {
  return leaderFormPetIdSet.has(Number(id))
}
