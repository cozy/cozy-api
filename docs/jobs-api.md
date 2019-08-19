# Jobs

### `cozy.clients.jobs.count(workerType)`

`cozy.clients.jobs.count` returns the number of jobs in the queue for `workerType`.

```javascript
const nb = cozy.client.jobs.count('sendmail')
console.log(`There are ${count} mails waiting to be sent`)
```

### `cozy.clients.jobs.create(workerType, arguments, options)`

`cozy.clients.jobs.create` enqueues a job in the queue for `workerType`.

```javascript
const job = cozy.client.jobs.create('sendmail', {
  mode: 'from',
  to: [
    { name: 'Support', email: 'contact@cozycloud.cc' }
  ],
  subject: 'Ask support for cozy-desktop',
  parts: [
    { type: 'text/plain', body: 'Hello, I would like some help' }
  ]
})
```

See [the cozy-stack documentation](https://docs.cozy.io/en/cozy-stack/jobs/#post-jobsqueueworker-type) for more informations
