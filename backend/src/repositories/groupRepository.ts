// repositories/groupRepository.ts
import pool from '../db'

export interface TripGroupRow {
  id: number
  name: string
  createdAt: string
  tripIds: number[]
  totalDistance: number
  totalDuration: number
  tripCount: number
}

/** Liste tous les groupes avec leurs trajets et stats agrégées */
export async function getAllGroups(): Promise<TripGroupRow[]> {
  const res = await pool.query(`
    SELECT
      g.id,
      g.name,
      g.created_at AS "createdAt",
      COALESCE(
        array_agg(m.trip_id ORDER BY t.starttime ASC)
        FILTER (WHERE m.trip_id IS NOT NULL),
        ARRAY[]::int[]
      ) AS "tripIds",
      COALESCE(SUM(t.distance), 0)::bigint  AS "totalDistance",
      COALESCE(SUM(t.duration), 0)::bigint  AS "totalDuration",
      COUNT(m.trip_id)::int                  AS "tripCount"
    FROM trip_groups g
    LEFT JOIN trip_group_members m ON m.group_id = g.id
    LEFT JOIN trips t ON t.id = m.trip_id
    GROUP BY g.id, g.name, g.created_at
    ORDER BY g.created_at DESC
  `)
  return res.rows
}

/** Crée un groupe et ajoute des trajets en une transaction */
export async function createGroup(name: string, tripIds: number[]): Promise<TripGroupRow> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const groupRes = await client.query(
      `INSERT INTO trip_groups (name) VALUES ($1) RETURNING id, name, created_at AS "createdAt"`,
      [name.trim()]
    )
    const group = groupRes.rows[0]

    if (tripIds.length > 0) {
      const values = tripIds.map((id, i) => `($1, $${i + 2})`).join(',')
      await client.query(
        `INSERT INTO trip_group_members (group_id, trip_id) VALUES ${values}
         ON CONFLICT DO NOTHING`,
        [group.id, ...tripIds]
      )
    }

    await client.query('COMMIT')
    return { ...group, tripIds, totalDistance: 0, totalDuration: 0, tripCount: tripIds.length }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/** Renomme un groupe */
export async function renameGroup(id: number, name: string): Promise<void> {
  const res = await pool.query(
    `UPDATE trip_groups SET name = $1 WHERE id = $2`,
    [name.trim(), id]
  )
  if ((res.rowCount ?? 0) === 0) throw new Error(`Groupe ${id} introuvable`)
}

/** Supprime un groupe (les membres sont supprimés en cascade) */
export async function deleteGroup(id: number): Promise<void> {
  await pool.query(`DELETE FROM trip_groups WHERE id = $1`, [id])
}

/** Ajoute un trajet à un groupe existant */
export async function addTripToGroup(groupId: number, tripId: number): Promise<void> {
  await pool.query(
    `INSERT INTO trip_group_members (group_id, trip_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [groupId, tripId]
  )
}

/** Retire un trajet d'un groupe */
export async function removeTripFromGroup(groupId: number, tripId: number): Promise<void> {
  await pool.query(
    `DELETE FROM trip_group_members WHERE group_id = $1 AND trip_id = $2`,
    [groupId, tripId]
  )
}
