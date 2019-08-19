# Sharing

### `cozy.client.files.getCollectionShareLink(id, collectionType)`

`getCollectionShareLink` creates codes that can be used to share a collection by links. See [the stack documentation](https://docs.cozy.io/en/cozy-stack/sharing/#sharing-by-links) for more informations.

```javascript
const sharing = cozy.client.files.getCollectionShareLink(albumID, 'io.cozy.albums')
console.log('Sharing id:', sharing.id)
console.log('Sharing query-string with the sharecode:', sharing.sharecode)
```
