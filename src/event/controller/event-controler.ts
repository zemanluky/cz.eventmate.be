import express, {type Request, type Response} from "express";
import { Event } from "../schema/db/event.schema";
import { queryValidator } from "../helper/request.validator";
import { allEventsValidator, filterEventsValidator, friendsEventsValidator, userEventsValidator } from "../schema/request/event.schema";
import { loginGuard } from "../helper/login-guard";
import { getFetchHeaders, microserviceUrl } from "../helper/microservice.url";
import type { AppRequest } from "../types";
import { date } from "zod";

export const eventController = express.Router();

eventController.get('/',
    queryValidator(allEventsValidator),
    async (req, res) => {// all events public events

        const pageSize = Number(req.query.pageSize);
        const pageNumber = Number(req.query.pageNumber);

        const event = Event.find({private: false}).limit(Number(pageSize)).skip(Number(pageSize) * Number(pageNumber)).exec();
        event.then((events) => {
            res.send(events);
        });
});

eventController.get('/friends',
    queryValidator(friendsEventsValidator), loginGuard(), async (req: AppRequest, res: Response) => { // all events created by friends of the user

        const pageSize = Number(req.query.pageSize);
        const pageNumber = Number(req.query.pageNumber);

        const userProfile = await fetch(microserviceUrl('user','profile', {userId: req.user!.id}), {
            headers: getFetchHeaders(),
        }).then((response) => {
            return response.json();
        }) 

        const event = Event.find({"ownerId" : {"$in" : userProfile.data.friends}}).limit(Number(pageSize)).skip(Number(pageSize) * Number(pageNumber)).exec();
        event.then((events) => {
            res.send(events);
        });
});

eventController.get('/user',
    queryValidator(userEventsValidator),
    loginGuard(),
    async (req, res) => {// all events of user

        const userId = req.query.userId;
        const pageSize = Number(req.query.pageSize);
        const pageNumber = Number(req.query.pageNumber);

        const event = Event.find({"ownerId": userId}).limit(Number(pageSize)).skip(Number(pageSize) * Number(pageNumber)).exec();
        event.then((events) => {
            res.send(events);
        });
});

eventController.get('/filter',
    queryValidator(filterEventsValidator),
    loginGuard(),
    async (req, res) => {// all events of user

        const R = 6371; // km

        const lo1 = Number(req.query.longtitude) || 0;
        const la1 = Number(req.query.latitude) || 0;
        const range = Number(req.query.range) || Number.MAX_SAFE_INTEGER;

        const dateStart =  req.query.dateStart || new Date(0);
        const dateEnd = req.query.dateEnd || new Date(8640000000000000);

        const type = req.query.type || "";

        const pageSize = Number(req.query.pageSize);
        const pageNumber = Number(req.query.pageNumber);

            const idk = Event.aggregate([
            {
              $addFields: {
                // Use input parameters directly, and convert them to radians
                lat1Rad: { $multiply: [{ $toDouble: la1 }, Math.PI / 180] },
                lon1Rad: { $multiply: [{ $toDouble: lo1 }, Math.PI / 180] },
                
                // Convert the database fields (lat2, lon2) from degrees to radians
                
                lat2Rad: { $multiply: [{ $toDouble: { $arrayElemAt: ["$location", 0] } }, Math.PI / 180] },
                lon2Rad: { $multiply: [{ $toDouble: { $arrayElemAt: ["$location", 1] } }, Math.PI / 180] }
              }
            },
            {
              $addFields: {
                // Calculate the differences (deltaLat, deltaLon) between input and DB coordinates
                deltaLat: { $subtract: ["$lat2Rad", "$lat1Rad"] },
                deltaLon: { $subtract: ["$lon2Rad", "$lon1Rad"] }
              }
            },
            {
              $addFields: {
                // Haversine formula calculation (a part of the formula)
                a: {
                  $add: [
                    { $pow: [{ $sin: { $divide: ["$deltaLat", 2] } }, 2] },
                    {
                      $multiply: [
                        { $cos: "$lat1Rad" },
                        { $cos: "$lat2Rad" },
                        { $pow: [{ $sin: { $divide: ["$deltaLon", 2] } }, 2] }
                      ]
                    }
                  ]
                }
              }
            },
            {
              $addFields: {
                // Calculate the distance using the Haversine formula
                distance: {
                  $multiply: [2 * 6371, { $asin: { $sqrt: "$a" } }]
                }
              }
            },
            {
              // Match the documents where the distance is within the provided range
              $match: {
                distance: { $lte: range},
                date: { $gte: dateStart, $lte: dateEnd},
                category: type
              }
            }
          ]).limit(Number(pageSize)).skip(Number(pageSize) * Number(pageNumber)).exec();

          idk.then((events) => {
            res.send(events);
          });
});