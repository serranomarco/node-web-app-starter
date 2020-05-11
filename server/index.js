const http = require('http');
const { readFile } = require('fs').promises;
const path = require('path');
const { Item } = require('../models');

const server = http.createServer(async (req, res) => {
    if (req.url.startsWith('/images')) {
        const imageFilePath = './assets' + req.url;
        let imageFileContents
        try {
            imageFileContents = await readFile(imageFilePath);
        } catch (e) {
            res.statusCode = 404;
            res.end();
            return;
        }

        const fileExtension = path.extname(req.url);
        const imageType = 'image/' + fileExtension.substring(1);

        res.statusCode = 200;
        res.setHeader('Content-Type', imageType);
        res.end(imageFileContents);
        return
    }

    if (req.url === '/items/new') {
        const formFilePath = './views/add-item.html';
        const formFileContents = await readFile(formFilePath);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        res.end(formFileContents);
        return
    }

    if (req.url === '/items' && req.method === 'POST') {
        let body = '';
        for await (let chunk of req) {
            body += chunk
        }
        const bodyData = body.split('&')
            .map(keyValue => keyValue.split('='))
            .map(([key, value]) => [key, value.replace(/\+/g, ' ')])
            .map(([key, value]) => [key, decodeURIComponent(value)])
            .reduce((acc, [key, value]) => {
                acc[key] = value;
                return acc;
            }, {});

        await Item.create(bodyData)

        res.statusCode = 302;
        res.setHeader('Location', '/');
        res.end();
        return;
    }

    if (req.method === 'POST' && req.url.startsWith('/items/')) {
        const pathParts = req.url.split('/');
        const id = Number.parseInt(pathParts[2]);

        if (pathParts[3] === 'used' && !isNaN(id)) {
            // Get the item, reduce the amount, save it
            const item = await Item.findByPk(id);
            item.amount -= 1;
            await item.save();

            // Redirect the browser to "/"
            res.statusCode = 302;
            res.setHeader('Location', '/');
            res.end();
            return;
        }
    }

    const items = await Item.findAll({ order: ['name'] });
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.write(` <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Inventory</title>
    </head>
    <body>
      <header>
        <div><a href="/items/new">Add a new item</a></div>
      </header>
      <main>
        <table>`);
    for (let item of items) {
        res.write(`
            <tr>
        `);
        if (item.imageName) {
            res.write(`<td><img width="50" src="/images/${item.imageName}"></td>`)
        } else {
            res.write(`<td></td>`)
        }
        res.write(`
            <td>${item.name}</td>
            <td>${item.description}</td>
            <td>${item.amount}</td>
            <td>`);
        if (item.amount > 0) {
            res.write(`
            <form method="post" action="/items/${item.id}/used">
                <button type="submit">Use one</button>
            </form>
            `);
        }
        res.write(`</td>
        </tr>`);
    }
    res.end(`
            </table>
        </main>
    </body>
    </html>`);
});

const port = 8081;
const hostname = '127.0.0.1';

server.listen(port, hostname, () => console.log(`Server running at http://${hostname}:${port}/`));
