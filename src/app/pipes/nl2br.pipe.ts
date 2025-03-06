import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
    name: 'nl2br',
    standalone: true
})
export class Nl2brPipe implements PipeTransform {
    constructor(private sanitizer: DomSanitizer) {}

    transform(value: string | null): SafeHtml {
        if (!value) {
            return '';
        }

        // Replace all newlines with <br> tags
        const result = value.replace(/(\r\n|\r|\n)/g, '<br>');

        // Mark the result as safe HTML to prevent sanitization
        return this.sanitizer.bypassSecurityTrustHtml(result);
    }
}