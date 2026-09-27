// Na dyskach exFAT readlink() na zwykłym pliku zwraca EISDIR zamiast EINVAL
// ("to nie jest dowiązanie"). Webpack i Next.js rozumieją tylko EINVAL,
// więc build na takim dysku przerywa się błędem. Ten plik tłumaczy kod błędu.
// Na NTFS, ext4 i innych systemach plików EISDIR tu nie występuje, więc nic się nie zmienia.
// Ładowany przez `node --require` w skrypcie build oraz przez server/index.ts.
const fs = require('node:fs');

function translate(error) {
    if (error && error.code === 'EISDIR' && error.syscall === 'readlink') {
        error.code = 'EINVAL';
        error.errno = -4071;
    }
    return error;
}

const readlink = fs.readlink;
fs.readlink = function patchedReadlink(path, ...args) {
    const callback = args.pop();
    return readlink.call(fs, path, ...args, (error, result) => callback(translate(error), result));
};

const readlinkSync = fs.readlinkSync;
fs.readlinkSync = function patchedReadlinkSync(...args) {
    try {
        return readlinkSync.apply(fs, args);
    } catch (error) {
        throw translate(error);
    }
};

const readlinkPromise = fs.promises.readlink;
fs.promises.readlink = async function patchedReadlinkPromise(...args) {
    try {
        return await readlinkPromise.apply(fs.promises, args);
    } catch (error) {
        throw translate(error);
    }
};
