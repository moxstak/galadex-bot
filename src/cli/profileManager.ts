import { ProfileCLI } from './profileCLI';

async function main() {
    const cli = new ProfileCLI();
    await cli.start();
}

if (require.main === module) {
    main().catch(console.error);
}
