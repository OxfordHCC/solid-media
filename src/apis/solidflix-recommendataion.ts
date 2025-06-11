
export async function fetchRecommendations(sampledTitles: string[]): Promise<string[]> {
  try {
    const response = await fetch('https://api.pod.ewada.ox.ac.uk/solidflix-recommender/', {
      method: 'POST',
      body: JSON.stringify(sampledTitles),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.body) return [];

    const body = await response.text();
    return JSON.parse(body);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }
}
