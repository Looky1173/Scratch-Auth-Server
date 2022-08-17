import fetch from 'node-fetch';
import { parseHTML } from 'linkedom';
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

    switch (latestQueue.type) {
        case queue.TYPES.CloudDataVerification:
            const cloud = await (await fetch(`https://clouddata.scratch.mit.edu/logs?projectid=${latestQueue.data.authProject || AUTH_PROJECT.id}&limit=20&offset=0`)).json();
            latestQueue.resolve(cloud);
            break;
        case queue.TYPES.CommentVerification:
            const usingCustomAuthProject = latestQueue.data.authProject !== AUTH_PROJECT.id;
            const author = usingCustomAuthProject
                ? (await (await fetch(`https://api.scratch.mit.edu/projects/${latestQueue.data.authProject}?cache=${Date.now()}`)).json()).author.username
                : AUTH_PROJECT.author;
            fetch(`https://api.scratch.mit.edu/users/${author}/projects/${usingCustomAuthProject ? latestQueue.data.authProject : AUTH_PROJECT.id}/comments?offset=0&limit=20&cache=${Date.now()}`)
                .then((response) => response.json())
                .then((data) => {
                    latestQueue.resolve(data);
                });
            break;
        case queue.TYPES.ProfileCommentVerification:
            const res = await fetch(`https://scratch.mit.edu/site-api/comments/user/${latestQueue.data.username}?cache=${Date.now()}`);
            const html = await res.text();
            const { document: doc } = parseHTML(html);
            const comments = [...doc.children].slice(0, -1).map((c) => ({
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
