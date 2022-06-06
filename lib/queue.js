import fetch from 'node-fetch';
import jsdom from 'jsdom';
import { QUEUE_ITEMS_PER_SECOND, AUTH_PROJECT } from '#lib/constants.js';

let queue = {
    tasks: [],
    itemsProcessed: 0,
};

queue.TYPES = {
    CloudDataVerification: 0,
    CommentVerification: 1,
    ProfileCommentVerification: 2,
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
            let cloud = await (await fetch(`https://clouddata.scratch.mit.edu/logs?projectid=${AUTH_PROJECT.id}&limit=20&offset=0`)).json();
            latestQueue.resolve(cloud);
            break;
        case queue.TYPES.CommentVerification:
            fetch(`https://api.scratch.mit.edu/users/${AUTH_PROJECT.author}/projects/${AUTH_PROJECT.id}/comments?offset=0&limit=20`)
                .then((response) => response.json())
                .then((data) => {
                    latestQueue.resolve(data);
                });
            break;
        case queue.TYPES.ProfileCommentVerification:
            const res = await fetch(`https://scratch.mit.edu/site-api/comments/user/${latestQueue.data.username}/?count=30`);
            const html = await res.text();
            const doc = (new jsdom.JSDOM(html)).window.document;
            const comments = [...doc.children[0].children[1].children].slice(0, -1).map((c) => ({
                author: c.getElementsByClassName('name')[0].textContent.trim(),
                text: c.getElementsByClassName('content')[0].textContent.trim(),
                replies: [...c.getElementsByClassName('replies')[0].children].map((r) => ({
                    author: r.getElementsByClassName('name')[0].textContent.trim(),
                    text: r.getElementsByClassName('content')[0].textContent.trim(),
                })),
            }));
            latestQueue.resolve(comments);
            break;
        case undefined:
            break;
    }
}, 1000 / QUEUE_ITEMS_PER_SECOND);

export default queue;
