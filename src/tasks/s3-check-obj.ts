import Ajv from 'ajv'
import { JobHelpers } from 'graphile-worker'
import { Pool } from 'pg'
import {
  S3CheckObjResponse,
  BodyUnits,
  KnownTopology,
} from '@curvewise/armscyence-types-s3-check-obj'

const ajv = new Ajv({ removeAdditional: true }).addSchema(
  require('@curvewise/armscyence-types-s3-check-obj/generated/schema.json')
)

type Topology = 'meshcapade_sm4'
type Units = 'm' | 'cm' | 'mm' | 'in'

function transformTopology(topology: KnownTopology | null): Topology | null {
  switch (topology) {
    case 'meshcapade-sm4-mid':
      return 'meshcapade_sm4'
    default:
      return null
  }
}

function transformUnits(units: BodyUnits | null): Units | null {
  switch (units) {
    case 'cm':
    case 'm':
    case 'mm':
      return units
    default:
      return null
  }
}

export function createS3CheckObjTask(pool: Pool) {
  return async function handleS3CheckObj(
    payload: unknown,
    { logger }: JobHelpers
  ): Promise<void> {
    if (!ajv.validate('#/definitions/S3CheckObjResponse', payload)) {
      logger.error(ajv.errorsText(ajv.errors))
      return
    }

    const validated = payload as S3CheckObjResponse

    if (!validated.success) {
      logger.warn(`Error occurred in ${validated.error_origin}`)
      logger.warn(validated.error.join('\n'))
      return
    }

    const {
      result: {
        checks: { isValidObj, topology, predictedBodyUnits },
        key,
        eTag,
      },
    } = validated

    logger.info(
      `${key}@${eTag} isValidObj: ${isValidObj} topology: ${topology} predictedBodyUnits: ${predictedBodyUnits}`
    )

    await pool.query(
      `
        INSERT INTO checked_uploads (e_tag, is_valid_obj, predicted_body_units, topology)
        VALUES($1, $2, $3, $4)
        ON CONFLICT (e_tag) 
        DO 
          UPDATE SET (is_valid_obj, predicted_body_units, topology) =
            (EXCLUDED.is_valid_obj, EXCLUDED.predicted_body_units, EXCLUDED.topology);
      `,
      [
        eTag,
        isValidObj,
        transformUnits(predictedBodyUnits),
        transformTopology(topology),
      ]
    )

    logger.info('Result written to checked_uploads')
  }
}
