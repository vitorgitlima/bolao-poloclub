export type PointsResult = {
  points: number;
  reason: string;
};

export function calculatePoints(
  predicted: { home: number; away: number },
  actual: { home: number; away: number }
): PointsResult {
  const predHome = Number(predicted.home);
  const predAway = Number(predicted.away);
  const actHome = Number(actual.home);
  const actAway = Number(actual.away);

  const exactMatch = predHome === actHome && predAway === actAway;

  const predictedDiff = predHome - predAway;
  const actualDiff = actHome - actAway;
  // Saldo de gols só se aplica em resultados não empatados (diff ≠ 0)
  // Empate vs empate diferente é apenas "vencedor certo" (3 pts)
  const correctGoalDiff = predictedDiff === actualDiff && predictedDiff !== 0;

  const predictedResult = getResult(predHome, predAway);
  const actualResult = getResult(actHome, actAway);
  const correctWinner = predictedResult === actualResult;

  let points = 0;
  let reason = "Errou";

  if (exactMatch) {
    points = 6;
    reason = "Placar exato!";
  } else if (correctGoalDiff) {
    points = 4;
    reason = "Saldo de gols certo";
  } else if (correctWinner) {
    points = 3;
    reason = "Vencedor certo";
  }

  return { points, reason };
}

function getResult(home: number, away: number): "home" | "away" | "draw" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

export function canPredictMatch(matchDate: Date): boolean {
  const now = new Date();
  const oneHourBefore = new Date(matchDate.getTime() - 10 * 60 * 1000);
  return now < oneHourBefore;
}
