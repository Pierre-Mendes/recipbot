import { registerDecorator, ValidationOptions } from 'class-validator';
import { IsPublicHttpUrlConstraint } from './is-public-http-url.validator';

export function IsPublicHttpUrl(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPublicHttpUrlConstraint,
    });
  };
}
