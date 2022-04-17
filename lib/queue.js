import fetch from 'node-fetch';
import { QUEUE_ITEMS_PER_SECOND, AUTH_PROJECT } from '#lib/constants.js';

let queue = {
    tasks: [],
    itemsProcessed: 0,
};

queue.TYPES = {
    CloudDataVerification: 0,
    CommentVerification: 1,
};

queue.add = function (type, data = {}) {
    const queueItem = { type: type, data: data };

    return new Promise((resolve, reject) => {
        queueItem.resolve = resolve;
        queue.tasks.push(queueItem);
    });
};

setInterval(async () => {
    if (queue.itemsProcessed >= QUEUE_ITEMS_PER_SECOND) {
        queue.itemsProcessed = 0;
    }

    let latestQueue;

    if (queue.tasks.length > 0) {
        latestQueue = queue.tasks.shift();
    }

    queue.itemsProcessed++;

    if (latestQueue == undefined) {
        return;
    }

    /* Analytic.increment('value', { where: { name: 'requestsToScratch' } }); */

    switch (latestQueue.type) {
        case queue.TYPES.CloudDataVerification:
            let cloud = await (await fetch(`https://clouddata.scratch.mit.edu/logs?projectid=${AUTH_PROJECT.id}&limit=10&offset=0`)).json();
            latestQueue.resolve(cloud);
            break;
        case queue.TYPES.CommentVerification:
            fetch(`https://api.scratch.mit.edu/users/${AUTH_PROJECT.author}/projects/${AUTH_PROJECT.id}/comments?offset=0&limit=20`)
                .then((response) => response.json())
                .then((data) => {
                    latestQueue.resolve(data);
                });
            break;
        case undefined:
            break;
    }
}, 1000 / QUEUE_ITEMS_PER_SECOND);

export default queue;
