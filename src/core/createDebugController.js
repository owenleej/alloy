/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

export default (instanceNamespace, getNamespacedStorage) => {
  // Segregate whether debugging is enabled by the SDK instance name.
  // This way consumers can debug one instance at a time.
  // TODO: Figure out how this plays out with segregating Web Storage
  // in the rest of the SDK. Is it segregated by Org ID or Property ID
  // in the rest of the SDK?
  const storage = getNamespacedStorage(`instance.${instanceNamespace}.`);

  let debugEnabled = storage.persistent.getItem("debug") === "true";

  return {
    get debugEnabled() {
      return debugEnabled;
    },
    set debugEnabled(value) {
      storage.persistent.setItem("debug", value);
      debugEnabled = value;
    }
  };
};
