export const leaderFormPetIds = [4, 7, 10, 11, 20, 29, 35, 40, 43, 48, 65, 78, 84, 110, 115, 117, 120, 122, 131, 144, 189, 200, 204, 228, 286, 288, 329]

export const leaderFormPetIdSet = new Set(leaderFormPetIds.map((id) => Number(id)))

export function hasLeaderFormPetId(id) {
  return leaderFormPetIdSet.has(Number(id))
}
