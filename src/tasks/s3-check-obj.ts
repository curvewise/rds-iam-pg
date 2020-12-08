import Ajv from 'ajv'
import { JobHelpers } from 'graphile-worker'
import { Pool } from 'pg'
import { S3CheckObjResponse_v1 as S3CheckObjResponse } from '@curvewise/armscyence-types-s3-check-obj'

const ajv = new Ajv({ removeAdditional: true }).addSchema(
  require('@curvewise/armscyence-types-s3-check-obj/generated/schema.json')
)

export function createS3CheckObjTask(pool: Pool) {
  return async function handleS3CheckObj(
    payload: unknown,
    { logger }: JobHelpers
  ): Promise<void> {
    if (!ajv.validate('#/definitions/S3CheckObjResponse_v1', payload)) {
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
        checks: { isValidObj },
        s3: {
          object: { key, eTag },
        },
      },
    } = validated

    logger.info(`${key}@${eTag} isValidObj: ${isValidObj}`)

    await pool.query(
      `
        INSERT INTO checked_uploads (e_tag, is_valid_obj)
        VALUES($1, $2)
        ON CONFLICT (e_tag) 
        DO 
          UPDATE SET is_valid_obj = EXCLUDED.is_valid_obj;
      `,
      [eTag, isValidObj]
    )

    logger.info('Result written to checked_uploads')
  }
}
