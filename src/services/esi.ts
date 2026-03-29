export interface CharacterInfo {
  id: number;
  name: string;
  portraitUrl: string;
  corporationName?: string;
  allianceName?: string;
  corporationId?: number;
  allianceId?: number;
}

export async function getCharacterByName(name: string): Promise<CharacterInfo | null> {
  try {
    // 1. Get character ID from name
    const idResponse = await fetch('https://esi.evetech.net/latest/universe/ids/?datasource=tranquility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([name])
    });
    const idData = await idResponse.json();
    const character = idData.characters?.[0];

    if (!character) return null;

    const charId = character.id;

    // 2. Get character details
    const charResponse = await fetch(`https://esi.evetech.net/latest/characters/${charId}/?datasource=tranquility`);
    const charDetails = await charResponse.json();

    // 3. Get corporation details
    let corpName = '';
    if (charDetails.corporation_id) {
      const corpResponse = await fetch(`https://esi.evetech.net/latest/corporations/${charDetails.corporation_id}/?datasource=tranquility`);
      const corpDetails = await corpResponse.json();
      corpName = corpDetails.name;
    }

    // 4. Get alliance details
    let allianceName = '';
    if (charDetails.alliance_id) {
      const allianceResponse = await fetch(`https://esi.evetech.net/latest/alliances/${charDetails.alliance_id}/?datasource=tranquility`);
      const allianceDetails = await allianceResponse.json();
      allianceName = allianceDetails.name;
    }

    return {
      id: charId,
      name: charDetails.name,
      portraitUrl: `https://images.evetech.net/characters/${charId}/portrait?size=128`,
      corporationName: corpName,
      allianceName: allianceName,
      corporationId: charDetails.corporation_id,
      allianceId: charDetails.alliance_id
    };
  } catch (error) {
    console.error('ESI Fetch Error:', error);
    return null;
  }
}
