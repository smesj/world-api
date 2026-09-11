import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
  });

  // Custom body parser that preserves raw body for webhooks
  app.use(bodyParser.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  }));

  // Enable CORS
  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Enable validation pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3003;
  await app.listen(port);
  console.log(`World API running on port ${port}`);
}
bootstrap();
