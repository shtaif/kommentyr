# Kommentyr
A sophisticated comment-posting app backed by a remote database using user images from Gravatar.

### Software Stack
Front end is based on React.
Backend is Node.js powered by Koa framework, with MongoDB with the Mongoose ORM/driver.

### Installation
Clone repository:
```bash
git clone https://github.com/shtaif/kommentyr.git
cd kommentyr
```
Install dependencies:
```bash
npm install
```
Kommentyr knows the database to connect to based on the `KMTR_DB_URI` environment variable.
Example to set this variable on Linux:
```bash
export KMTR_DB_URI=mongodb://localhost:27017/kommentyr
```
**Optional:** To override the default port of `4443`, the environment variable `KMTR_PORT` can also be set:
```bash
export KMTR_PORT=4000
```

### Running
Start server via the `start` script:
```bash
npm start
```
When seeing the message `Secure HTTP2 server running on <SOME_PORT>` app is ready.
If running on `localhost` with default port:
**https://localhost:4443**
will serve the app.



### Notable features
- Live search (searches comments from the DB, ensuring reliable results)
- Pagination through Infinite scrolling (Add a lot of comments and see it in action!)
- Modal with High-res image shown when clicking on a commenter's image.
- In the user modal, clicking on the email address automatically filters for that user's own comments.
- More...

### Important notes (please read before running)
- Ignore the warning about the HTTP2 module, it is emitted from Node.js itself and will probably disappear in the next Node.js releases.
- Why HTTPS? - I've chosen to use HTTP2 in this project because I think it is the future of the Web and can significantly benefit most projects. However, as for now, major browsers have chosen to support only the Secured HTTP2 (and will probably keep it like that), therefore the app is accessible only through `https://`.
- When accessing the frontend app in Chrome for the first time, a warning screen may display regarding invalid TLS certificate - It's normal and expected and caused by the certificate being self-signed. Just click on "`ADVANCED`" and then "`Proceed to...`".
