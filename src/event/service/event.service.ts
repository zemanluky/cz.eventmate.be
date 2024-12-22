import { NotFoundError } from "../error/response/not-found.error.ts";
import { getFetchHeaders, microserviceUrl } from "../helper/microservice.url";
import {Event, type IEvent, type THydratedEventDocument} from "../schema/db/event.schema";
import type {TEventBody, TFilterEventsValidator} from "../schema/request/event.schema";
import type {TResponse} from "../helper/response.helper.ts";
import {ServerError} from "../error/response/server.error.ts";
import {BadRequestError} from "../error/response/bad-request.error.ts";
import {PermissionError} from "../error/response/permission.error.ts";
import { Types } from "mongoose";
import { startOfMonth, endOfMonth } from 'date-fns';


/**
 * Gets a filtered and paginated list of events.
 * @param queryFilter
 * @param userId
 */
export async function getFilteredEvents(queryFilter: TFilterEventsValidator, userId: string) {
    const { location, dateStart, dateEnd, rating, category, filter, pageSize, pageNumber, userId: authorId } = queryFilter;

    // fetch list of friends of the current user
    const friendListResponse: TResponse<Array<string>> = await fetch(microserviceUrl('user', `${userId}/friend-list`), {
        headers: getFetchHeaders(),
    }).then((response) => {
        return response.json();
    });

    if (!friendListResponse.success)
        throw new ServerError(`Failed to fetch friend list of current user due to an error on the microservice: ${friendListResponse.error.message}`);

    const baseQuery = Event.find();

    // filter events only accessible to the user
    if (filter === 'friends-only') {
        if (authorId && friendListResponse.data.includes(authorId)) {
            baseQuery.where({ private: true, ownerId: new Types.ObjectId(authorId) });
        }
        else if (!authorId) {
            baseQuery.where({ private: true, ownerId: { $in: friendListResponse.data.map(id => new Types.ObjectId(id)) } });
        }
        // we have an author filter set, but the author is not in the friend list
        else {
            throw new BadRequestError('Cannot filter private events of a user who is not your friend.', 'event.filter:private');
        }
    }
    else if (filter === 'public-only') {
        baseQuery.where({ private: false, ownerId: { $ne: userId } });
    }
    else {
        if (authorId && !friendListResponse.data.includes(authorId)) {
            baseQuery.where({ private: true, ownerId: new Types.ObjectId(authorId) });
        }
        else {
            baseQuery.or([
                { private: false, ownerId: { $ne: userId } },
                { private: true, ownerId: { $in: friendListResponse.data.map(id => new Types.ObjectId(id)) } }
            ]);
        }
    }

    // filter by the location of the event and its category
    if (location) baseQuery.where({ location: new RegExp(`${location}`, 'i') });
    if (category) baseQuery.where({ category });

    // filter by date range of the event
    if (dateStart && dateEnd) {
        baseQuery.where({date: { $gte: dateStart, $lte: dateEnd }});
    }
    else if (dateEnd) {
        baseQuery.where({date: { $lte: dateEnd }});
    }
    else if (dateStart) {
        baseQuery.where({date: { $gte: dateStart }});
    }

    const events = await baseQuery
        .skip(pageSize * (pageNumber - 1))
        .limit(pageSize)
        .exec();

    if (events.length === 0)
        return events;

    const authorIdSet = new Set(events.map((event) => event.ownerId.toString()));
    const authorsResponse: TResponse<Record<string, any>> = await fetch(
        microserviceUrl('user', 'authors', { authorIds: authorIdSet.values().toArray().join(',') }),
        {headers: getFetchHeaders()}
    ).then(res => res.json());

    if (!authorsResponse.success)
        throw new ServerError(`Failed to fetch authors list of retrieved events due to an error on the microservice: ${authorsResponse.error.message}`);

    const eventsWithAuthors: Array<IEvent & { author: any }> = [];

    for (const event of events) {
        if (!(event.ownerId.toString() in authorsResponse.data))
            continue;

        if (
            rating && authorsResponse.data[event.ownerId.toString()].average_rating !== null
            && authorsResponse.data[event.ownerId.toString()].average_rating < rating
        ) {
            continue;
        }

        eventsWithAuthors.push({
            ...event.toObject(),
            author: authorsResponse.data[event.ownerId.toString()]
        });
    }

    return eventsWithAuthors;
}

/**
 * Adds author detail to an event object.
 * @param event
 */
async function addAuthorDetail(event: THydratedEventDocument): Promise<IEvent & { author: any }> {
    const authorsResponse: TResponse<Record<string, any>> = await fetch(
        microserviceUrl('user', 'authors', { authorIds: event.ownerId.toString() }),
        {headers: getFetchHeaders()}
    ).then(res => res.json());

    if (!authorsResponse.success)
        throw new ServerError(`Failed to fetch authors list of retrieved events due to an error on the microservice: ${authorsResponse.error.message}`);

    if (!(event.ownerId.toString() in authorsResponse.data))
        throw new ServerError('Invalid event object.');

    return {
        ...event.toObject(),
        author: authorsResponse.data[event.ownerId.toString()]
    }
}

/**
 * Gets detail of a single event.
 * @param id
 */
export async function getEvent(id: string): Promise<IEvent & { author: any }> {
    const event = await Event.findById(id);

    if (!event)
        throw new NotFoundError(`Could not find event with ID: ${id}.`, "event");

    return addAuthorDetail(event);
}

/**
 * Creates new event with given data.
 * @param event
 * @param userId
 */
export async function createEvent(event: TEventBody, userId: string): Promise<IEvent> {
    const newEvent = new Event({
        ...event,
        description: event.description ?? null,
        ownerId: new Types.ObjectId(userId),
        category: "general" // TODO: implement saving of the category with checking the existence of the category
    });

    return addAuthorDetail(await newEvent.save());
}

/**
 * Updates existing event with new data.
 * @param id
 * @param updates
 * @param userId
 */
export async function updateEvent(id: string, updates: TEventBody, userId: string): Promise<IEvent> {
    const event = await Event.findById(id);

    if (!event)
        throw new NotFoundError(`Could not find event with ID: ${id}.`, "event");

    if (!event.ownerId.equals(userId))
        throw new PermissionError('You are not authorized to update this event.', 'event:write');

    const updatedEvent = await Event.findByIdAndUpdate(
        id, {...updates, description: updates.description ?? null}, {new: true}
    );

    return addAuthorDetail(updatedEvent!);
}

export const markAttendance = async (eventId: string, userId: string) => {
    // Find the event by ID
    const event = await Event.findById(eventId);
    if (!event) {
        throw new NotFoundError(`Could not find event with ID: ${eventId}.`, "event");
    }

    // Check if user is allowed to mark attendance (only non-private events or members can mark)
    if (event.private && event.ownerId.toString() !== userId) {
        throw new PermissionError('You are not authorized to mark attendance for this event', "event");
    }

    // Convert userId to ObjectId for proper comparison and storage
    const userObjectId = new Types.ObjectId(userId);

    // Check if the user is already in the attendees list
    const attendanceIndex = event.attendees.findIndex(attendee => attendee.toString() === userObjectId.toString());

    if (attendanceIndex === -1) {
        // If the user is not attending, add them
        event.attendees.push(userObjectId);
    } else {
        // If the user is already attending, remove them (toggle attendance)
        event.attendees.splice(attendanceIndex, 1);
    }

    // Save the updated event
    await event.save();

    return { message: "Attendance updated successfully" };
};

export const removeAttendance = async (eventId: string, userId: string) => {
    // Find the event by ID
    const event = await Event.findById(eventId);
    if (!event) {
        throw new NotFoundError(`Could not find event with ID: ${eventId}.`, "event");
    }

    // Check if the user is attending
    const userObjectId = new Types.ObjectId(userId);
    const attendanceIndex = event.attendees.indexOf(userObjectId);

    if (attendanceIndex === -1) {
        throw new BadRequestError("User is not attending this event.", "event:attendance");
    }

    // Remove the user from the attendees list
    event.attendees.splice(attendanceIndex, 1);
    
    // Save the updated event
    await event.save();

    return { message: "Attendance removed successfully" };
};

export async function getMonthOverview(userId: string, queryFilter: TFilterEventsValidator) {
    const { rating, filter } = queryFilter;

    const startOfMonthDate = startOfMonth(new Date());
    const endOfMonthDate = endOfMonth(new Date());

    const baseQuery = Event.find({
        date: { $gte: startOfMonthDate, $lte: endOfMonthDate }
    });

    if (rating) {
        baseQuery.where({
            rating: { $gte: rating }
        });
    }

    if (filter === 'friends-only') {
        baseQuery.where({ private: true, ownerId: { $in: [userId] } });
    } else if (filter === 'public-only') {
        baseQuery.where({ private: false });
    }

    const events = await baseQuery.exec();

    return events;
}
