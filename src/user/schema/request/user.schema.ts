import {z} from "zod";
import {zodObjectId} from "../../utils/validation.utils.ts";
import {Types} from "mongoose";

export const usernameValidator = z.string()
    .toLowerCase()
    .trim()
    .min(5)
    .regex(/^[a-z_-]+$/gm);

export const registerUserBodySchema = z.object({
    name: z.string().trim().min(1),
    surname: z.string().trim().min(1),
    username: usernameValidator,
    email: z.string().email(),
    password: z.string()
        .trim()
        .regex(/^(?=(.*[a-z])+)(?=(.*[A-Z])+)(?=(.*[0-9])+)(?=(.*[!"#$%&'()*+,-.\/:;<=>?@[\]^_`{|}~])+).{8,72}$/gm)
});

export const updateUserSchema = registerUserBodySchema
    .omit({ password: true, email: true })
    .merge(z.object({
        bio: z.string().optional()
    }));

export const verifyAvailabilityQuerySchema = z.object({
    email: z.string().email(),
    username: usernameValidator
}).partial();

export const identityByEmailParamSchema = z.object({ email: z.string().email() });

export const userIdParamSchema = z.object({
    id: z.string().trim().pipe(zodObjectId).transform(val => new Types.ObjectId(val))
});

export const friendRequestQuerySchema = z.object({
    userId: z.string().min(0,"User ID is required."),
});
export type TFriendRequestQuery = z.infer<typeof friendRequestQuerySchema>;





export type TRegistrationData = z.infer<typeof registerUserBodySchema>;
export type TUpdateUserData = z.infer<typeof updateUserSchema>;
export type TAvailabilityQuery = z.infer<typeof verifyAvailabilityQuerySchema>;
export type TIdentityByEmailParams = z.infer<typeof identityByEmailParamSchema>;

export const authorsListQuerySchema = z.object({
    authorIds: z.string()
        .transform(val => val.split(','))
        .pipe(
            z.array(z.string().trim().pipe(zodObjectId).transform(val => new Types.ObjectId(val)))
        )
});
export type TAuthorListQuery = z.infer<typeof authorsListQuerySchema>;