export type PointsResult = {
  points: number;
  reason: string;
};

export function calculatePoints(
  predicted: { home: number; away: number },
  actual: { home: number; away: number },
  isDouble: boolean
): PointsResult {
  const exactMatch =
    predicted.home === actual.home && predicted.away === actual.away;

  const predictedDiff = predicted.home - predicted.away;
  const actualDiff = actual.home - actual.away;
  const correctGoalDiff = predictedDiff === actualDiff;

  const predictedResult = getResult(predicted.home, predicted.away);
  const actualResult = getResult(actual.home, actual.away);
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

  if (isDouble) {
    points *= 2;
    if (points > 0) reason += " (x2 Double Points!)";
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
