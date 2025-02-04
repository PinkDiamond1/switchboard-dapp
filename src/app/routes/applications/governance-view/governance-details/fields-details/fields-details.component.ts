import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IFieldDefinition } from 'iam-client-lib';

@Component({
  selector: 'app-fields-details',
  templateUrl: './fields-details.component.html',
  styleUrls: ['./fields-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldsDetailsComponent {
  @Input() title: string;
  @Input() data: IFieldDefinition[];
  displayedColumnsView: string[] = [
    'type',
    'label',
    'required',
    'minLength',
    'maxLength',
    'pattern',
    'minValue',
    'maxValue',
    'minDate',
    'maxDate',
  ];
}
