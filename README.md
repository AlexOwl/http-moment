# http-moment

[![type](https://img.shields.io/npm/types/http-moment.svg?style=for-the-badge)
![travis](https://img.shields.io/travis/com/AlexOwl/http-moment.svg?style=for-the-badge)
![npm](https://img.shields.io/npm/v/http-moment.svg?style=for-the-badge)
![dependencies](https://img.shields.io/david/AlexOwl/http-moment.svg?style=for-the-badge)](https://github.com/AlexOwl/http-moment)

### Multiple requests are processed by the server at exactly one specific moment

# 💿 Installation

```bat
npm i http-moment
```

# ❓ How it works

1. Send buffer except the last byte to the server

2. Ensure that all buffers are sent

3. Simultaneously send the last bytes of all requests

# 📖 Usage

```ts
import { http, https } from "http-moment";
const { http, https } = require("http-moment");

const agent = new https.Agent();

agent.cork(5);

for (let i = 0; i < 5; ++i)
  request("https://example.com", { agent }, console.log);

agent.cork(2);
request("https://example.com", { agent }, console.log);
request.post("https://example.com/hello", { agent, body: "hi" }, console.log);
```

# ⏲ Http(s)Agent

## Methods

### cork

```ts
cork(count: Number = 0): Promise
```

- `count` - if `>= 1`, would uncork agent after `count` requests

```ts
/* Usage example */
agent.cork();
agent.cork(0);

agent.cork(5); /* auto uncork after 5 requests */
```

### uncork

```ts
uncork(): Promise
```

It's better to provide specific `count` instead of manual use this method

```ts
/* Usage example  */
agent.cork();
request("https://example.com", { agent }, console.log);
request("https://example.com/hello", { agent }, console.log);

// agent.uncork() - you can't use uncork immediately

setTimeout(() => agent.uncork(), 3000);
```

# 📝 License

Released under [MIT license](https://AlexOwl.mit-license.org/)

# 🦉 [Alex Owl](https://github.com/AlexOwl)
