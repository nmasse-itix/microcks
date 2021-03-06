/*
 * Licensed to Laurent Broudoux (the "Author") under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. Author licenses this
 * file to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, ParamMap } from "@angular/router";

import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Notification, NotificationEvent, NotificationService, NotificationType } from 'patternfly-ng/notification';

import { Operation, Service, ServiceType, ServiceView, OperationMutableProperties } from '../../../../models/service.model';
import { ServicesService } from '../../../../services/services.service';
import { dispatch } from 'rxjs/internal/observable/range';

@Component({
  selector: 'operation-override-page',
  templateUrl: './operation-override.page.html',
  styleUrls: ['./operation-override.page.css']
})
export class OperationOverridePageComponent implements OnInit {

  serviceId: string;
  operationName: string
  serviceView: Observable<ServiceView>;
  resolvedServiceView: ServiceView;
  operation: Operation;
  newOperation: Operation;
  notifications: Notification[];

  examplePayload =  `{
  "name": "Abbey Brune",
  "country": "Belgium",
  "type": "Brown ale",
  "rating": 4.2,
  "references": [
    { "referenceId": 1234 },
    { "referenceId": 5678 }
  ]
}`;

  equalsOperator = `{
  "exp": "/country",
  "operator": "equals",
  "cases": {
    "Belgium": "Accepted",
    "default": "Not accepted"
  }
}`;

  rangeOperator = `{
  "exp": "/rating",
  "operator": "range",
  "cases": {
    "[4.2;5.0]": "Top notch",
    "[3;4.2[": "Medium",
    "default": "Not accepted"
  }
}`;

  sizeOperator = `{
  "exp": "/references",
  "operator": "size",
  "cases": {
    "[2;100]": "Good references",
    "default": "Not enough references"
  }
}`;

  regexpOperator = `{
  "exp": "/type",
  "operator": "regexp",
  "cases": {
    ".*[Aa][Ll][Ee].*": "Ale beers",
    "default": "Not accepted"
  }
}`;

  presenceOperator = `{
  "exp": "/name",
  "operator": "presence",
  "cases": {
    "found": "Got a name",
    "default": "Missing a name"
  }
}`;

  constructor(private servicesSvc: ServicesService, private notificationService: NotificationService,
    private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    this.notifications = this.notificationService.getNotifications();
    this.operationName = this.route.snapshot.paramMap.get('name');
    this.serviceView = this.route.paramMap.pipe(
      switchMap((params: ParamMap) => 
        this.servicesSvc.getServiceView(params.get('serviceId')))
    );
    this.serviceView.subscribe( view => {
      this.serviceId = view.service.id;
      this.resolvedServiceView = view;
      for (var i=0; i<this.resolvedServiceView.service.operations.length; i++) {
        if (this.operationName === this.resolvedServiceView.service.operations[i].name) {
          this.operation = this.resolvedServiceView.service.operations[i];
          // Clone mutable properties from oepration.
          this.newOperation = new Operation();
          this.newOperation.defaultDelay = this.operation.defaultDelay;
          this.newOperation.dispatcher = this.operation.dispatcher;
          this.newOperation.dispatcherRules = this.operation.dispatcherRules;
          break;
        }
      }
    });
  }

  public resetOperationProperties() {
    this.newOperation = new Operation();
    this.newOperation.defaultDelay = this.operation.defaultDelay;
    this.newOperation.dispatcher = this.operation.dispatcher;
    this.newOperation.dispatcherRules = this.operation.dispatcherRules;
  }
  public saveOperationProperties() {
    var operationProperties = {defaultDelay: this.newOperation.defaultDelay,
      dispatcher: this.newOperation.dispatcher,
      dispatcherRules: this.newOperation.dispatcherRules
    };
    console.log("[saveOperationProperties] operationProperties: " + JSON.stringify(operationProperties));
    this.servicesSvc.updateServiceOperationProperties(this.resolvedServiceView.service,
      this.operationName, operationProperties).subscribe(
        {
          next: res => {
            this.notificationService.message(NotificationType.SUCCESS,
              this.operationName, "Dispatch properies have been updated", false, null, null);
          },
          error: err => {
            this.notificationService.message(NotificationType.DANGER,
              this.operationName, "Dispatch properties cannot be updated (" + err.message + ")", false, null, null);
          },
          complete: () => console.log('Observer got a complete notification'),
        }
      );
  }

  public copyDispatcherRules(operator: string) {
    this.newOperation.dispatcherRules = operator;
  }

  handleCloseNotification($event: NotificationEvent): void {
    this.notificationService.remove($event.notification);
  }
}